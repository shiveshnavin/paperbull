import { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';


import { Resolution, Snapshot, TickerApi } from './TickerApi';
import { PickedFile } from '../components/filepicker/FilePickerProps';
import { Tick } from './models/Tick';

const CHUNK_SIZE = 512 * 1024; // 64KB chunks
const BATCH_SIZE = 200;    // Number of records per insert batch

const TABLE_MARKET_DATA_FULL = 'market_data'
const TABLE_SYMBOL_CACHE = 'symbol_cache'
const TABLE_MARKET_DATA_RUNTIME = 'market_data_runtime'

export type MarketDataRow = {
    symbol: string
    datetime: number
    date: string
    time: string
    last_price: number
}
export class SqliteTickerApi extends TickerApi {
    dbCold!: SQLiteDatabase;
    dbHot!: SQLiteDatabase;

    constructor(timeframe: Resolution = 'realtime') {
        super(timeframe)
    }

    async subscribe(
        instrumentTokens: string[],
        resolution: "realtime" | "1s" | "10s" | "1m" | "10m",
        onProgress?: (progress: number, total: number) => void,
        setCancelHook?: (cancelCallback: () => void) => void
    ) {
        await this.dbHot?.execAsync(`DROP TABLE IF EXISTS ${TABLE_MARKET_DATA_RUNTIME}`)
        await this.createHotMktDataTable()
        // Save instrument tokens for later reference.
        this.setSymbols(instrumentTokens);
        let isCancelled = false;
        if (setCancelHook) {
            setCancelHook(() => {
                console.log("subscription cancelled");
                isCancelled = true;
            });
        }

        // Convert resolution to an interval in milliseconds.
        let resolutionInterval: number | null = 0;
        if (resolution !== "realtime") {
            const unit = resolution.slice(-1);
            const value = parseInt(resolution);
            if (unit === "s") {
                resolutionInterval = value * 1000;
            } else if (unit === "m") {
                resolutionInterval = value * 60 * 1000;
            }
        }

        // Build the base query with parameter placeholders.
        const tokensPlaceholder = instrumentTokens.map(() => '?').join(',');
        const baseQuery = `
          SELECT symbol, datetime, date, time, last_price 
          FROM ${TABLE_MARKET_DATA_FULL} 
          WHERE symbol IN (${tokensPlaceholder})
          ORDER BY symbol, datetime ASC
        `;

        // Optionally, get total row count for progress updates.
        let totalRows = 0;
        try {
            const countQuery = `
            SELECT COUNT(*) as count 
            FROM ${TABLE_MARKET_DATA_FULL} 
            WHERE symbol IN (${tokensPlaceholder})
          `;
            const countResult: any[] = await this.dbCold.getAllAsync(countQuery, instrumentTokens);
            totalRows = countResult[0].count;
        } catch (error) {
            console.error("Error fetching total count. Progress may not be accurate.", error);
        }

        let processed = 0;
        const batchSize = 10000;
        let offset = 0;
        // Keep track of the last accepted datetime for each symbol.
        const lastCopied: { [symbol: string]: number } = {};
        let inserts = 0
        if (onProgress) onProgress(processed, totalRows);

        // Process the data in batches.
        while (!isCancelled) {
            const batchQuery = `${baseQuery} LIMIT ${batchSize} OFFSET ${offset}`;
            const batch: any[] = await this.dbCold.getAllAsync(batchQuery, instrumentTokens);
            if (batch.length === 0) {
                break;
            }
            const toInsertBatch: any[] = [];

            for (const row of batch) {
                if (isCancelled) {
                    console.log("Operation cancelled. Exiting subscription loop.");
                    break;
                }

                const symbol = row.symbol;
                // Apply resolution filtering if needed.
                if (resolutionInterval !== null) {
                    const lastTime = lastCopied[symbol] || 0;
                    if (row.datetime - lastTime < resolutionInterval) {
                        processed++;
                        continue;
                    }
                    lastCopied[symbol] = row.datetime;
                }

                // Insert the row into the runtime (hot) database.
                toInsertBatch.push(row);


                processed++;

            }
            if (toInsertBatch.length > 0) {
                inserts = inserts + toInsertBatch.length
                const placeholders = toInsertBatch.map(() => '(?, ?, ?, ?, ?)').join(',');
                const sql = `INSERT INTO ${TABLE_MARKET_DATA_RUNTIME} (symbol, datetime, date, time, last_price) VALUES ${placeholders}`;
                const params = toInsertBatch.flatMap(record => [
                    record.symbol,
                    record.datetime,
                    record.date,
                    record.time,
                    record.last_price,
                ]);
                await this.dbHot.runAsync(sql, params);
            }

            if (onProgress) onProgress(processed, totalRows);
            if (batch.length < batchSize) break;
            offset += batchSize;
        }
        console.log('subscribed ', inserts, 'data points captured in hot db')
    }

    async clearDb() {
        await this.dbHot?.execAsync(`DELETE from symbol_cache WHERE 1 = 1`)
        return Promise.all([
            this.dbCold?.execAsync(`DROP TABLE IF EXISTS ${TABLE_MARKET_DATA_FULL}`),
            this.dbHot?.execAsync(`DROP TABLE IF EXISTS ${TABLE_MARKET_DATA_RUNTIME}`)
        ])
    }

    async getTicks(datetimefrom: number, datetimeto: number, onTick: (ticks: Tick[]) => Promise<void>)
        : Promise<number> {


        const batchSize = 100; // Define batch size
        let offset = 0;
        let totalFetched = 0;

        while (true) {
            const query = `
            SELECT * FROM ${TABLE_MARKET_DATA_RUNTIME} 
            WHERE (datetime >= ${datetimefrom} )
            AND (datetime <= ${datetimeto} )
            ORDER BY datetime ASC
            LIMIT ${batchSize} OFFSET ${offset}
        `;

            let dum = new Tick({
                datetime: datetimefrom
            })
            let dum2 = new Tick({
                datetime: datetimeto
            })
            console.log('query', dum.getTime(), dum2.getTime(), query)
            const params = [datetimefrom, datetimeto, batchSize, offset];

            const result: any = await this.dbHot.getAllAsync(query);//, params
            let ticks = result.map(this.mapDbRowToTick);
            await onTick(ticks);
            if (ticks.length === 0) break;

            totalFetched += ticks.length;
            offset += batchSize;
        }

        return totalFetched;

    }

    async getDataSize(date?: string, time?: string): Promise<number> {
        let query = `SELECT count(*) as cnt FROM ${TABLE_MARKET_DATA_FULL} m `;
        if (date) {
            query = query + `WHERE date = '${date}'`
        }
        if (time) {
            query = query + ` AND date = '${time}'`
        }
        const result: any = await this.dbCold.getFirstAsync(query);
        return result.cnt;
    }
    private async getFromCache(date?: string): Promise<MarketDataRow[]> {
        const query = date
            ? `SELECT * FROM symbol_cache WHERE date = ?;`
            : `SELECT * FROM symbol_cache;`;
        const result: MarketDataRow[] = await this.dbHot.getAllAsync(query, date ? [date] : []);
        return result
    }

    private async updateCache(rows: MarketDataRow[]): Promise<void> {
        const query = `
        INSERT OR REPLACE INTO ${TABLE_SYMBOL_CACHE} (symbol, datetime, date, time, last_price)
        VALUES (?, ?, ?, ?, ?);
    `;
        for (const row of rows) {
            await this.dbHot.runAsync(query, [
                row.symbol,
                row.datetime,
                row.date,
                row.time,
                row.last_price
            ]);
            console.log('Inserted in cache', row)
        }
    }

    async getAvailableSymbols(date?: string): Promise<Tick[]> {
        const cachedResults = await this.getFromCache(date);
        if (cachedResults.length > 0) {
            return cachedResults.map(this.mapDbRowToTick);
        }
        console.log('Missing from cache')

        let query = `
            SELECT *
                FROM market_data
                WHERE (symbol, datetime) IN (
                    SELECT symbol, MAX(datetime)
                    FROM market_data
                    ${date ? `WHERE date = '${date}'` : ''}  
                    GROUP BY symbol
                );
        `;
        const result: MarketDataRow[] = await this.dbCold.getAllAsync(query);
        const ticks = result.map(this.mapDbRowToTick);
        await this.updateCache(result);

        return ticks;
    }

    async getSnapShot(date: string, time: string): Promise<Snapshot> {
        if ((this.snapshot?.date == date
            && this.snapshot.time == time
            && this.snapshot.ticks?.length > 0)) {
            return this.snapshot
        }

        const placeholders = this.symbols.map(() => '?').join(',');
        let query = `
            SELECT m.* FROM ${TABLE_MARKET_DATA_RUNTIME} m
             INNER JOIN (
                SELECT symbol, MAX(datetime) AS max_datetime
                FROM ${TABLE_MARKET_DATA_RUNTIME}
                WHERE symbol IN (${placeholders})
                AND ( date = '${date}' AND time <= '${time}')
                GROUP BY symbol
            ) latest 
            ON m.symbol = latest.symbol 
            AND m.datetime = latest.max_datetime
        `;

        const result: any = await this.dbHot.getAllAsync(query, this.symbols);
        console.log(query, this.symbols)
        console.log('result==>', result)

        let ticks = result.map(this.mapDbRowToTick);
        let snapshot = {
            date,
            time,
            ticks
        } as Snapshot
        this.snapshot = snapshot
        return snapshot
    }

    private mapDbRowToTick(row: any): Tick {
        return new Tick(row)
    }

    async init() {
        if (!this.dbCold) {
            this.dbCold = await SQLite.openDatabaseAsync('market_data.sqlite');
            this.dbHot = await SQLite.openDatabaseAsync('market_data_runtime.sqlite');
            await this.createCacheTableIfNotExists()
            await this.createFullMktDataTable()
            await this.createHotMktDataTable()
            await this.createFullMktIndex()
            await this.createHotMktIndex()
        }
    }

    async test() {

        console.log('run test quer 5');

        //@ts-ignore
        (this.dbHot.getAllAsync(`
            SELECT symbol, count(*) as avount FROM market_data_runtime 
            group by symbol
            `)).then((res) => {
            console.log(res)
        }).catch((e: any) => {
            console.log('errr in init q', e.message)
        })
    }

    async loadFromCsv(
        file: PickedFile,
        onProgress?: (progress: number, total: number) => void,
        setCancelHook?: (cancelCallback: () => void) => void) {
        let isCancelled = false
        setCancelHook && setCancelHook(() => {
            console.log('Ingestion cancelled')
            isCancelled = true
        })
        const path = file.uri
        await this.createFullMktDataTable()
        console.log('Loading CSV from ', path)

        const fileInfo = await FileSystem.getInfoAsync(path);
        console.log('fileInfo', fileInfo)

        if (!fileInfo.exists) {
            throw new Error(`File not found: ${path}`);
        }

        let position = 0;
        let remaining = '';
        let isFirstLine = true;
        let batch: any[] = [];
        let recordSize = 0

        while (position < fileInfo.size) {
            if (isCancelled) {
                return
            }
            onProgress && onProgress(position, fileInfo.size)
            const chunk = await file.reader.getChunk(position, CHUNK_SIZE)
            const content = remaining + chunk;
            const lines = content.split('\n');
            remaining = lines.pop() || '';

            for (const line of lines) {
                if (isFirstLine) {
                    isFirstLine = false;
                    continue;
                }

                const record = this.parseLine(line);
                if (record) {
                    batch.push(record);
                    if (batch.length >= BATCH_SIZE) {
                        recordSize += batch.length
                        await this.insertBatch(batch);
                        batch = [];
                    }
                }
            }

            position += CHUNK_SIZE;
        }

        if (remaining && !isFirstLine) {
            const record = this.parseLine(remaining);
            if (record) batch.push(record);
        }

        if (batch.length > 0) {
            await this.insertBatch(batch);
        }
        recordSize += batch.length
        onProgress && onProgress(recordSize, recordSize)

    }

    private parseLine(line: string): any {
        const parts = this.splitCSVLine(line);
        if (parts.length !== 5) return null;

        return {
            symbol: parts[0],
            datetime: parseInt(parts[1], 10),
            date: parts[2],
            time: parts[3],
            last_price: parseFloat(parts[4])
        };
    }

    private splitCSVLine(line: string): string[] {
        const parts = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        parts.push(current);
        return parts;
    }

    async insertBatch(batch: any[]) {
        if (batch.length === 0) return;
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(',');
        const sql = `INSERT INTO market_data (symbol, datetime, date, time, last_price) VALUES ${placeholders}`;

        const params = batch.flatMap(record => [
            record.symbol,
            record.datetime,
            record.date,
            record.time,
            record.last_price,
        ]);

        await this.dbCold.runAsync(sql, params);
    }

    async createFullMktDataTable() {
        await this.dbCold.execAsync(`
            CREATE TABLE IF NOT EXISTS ${TABLE_MARKET_DATA_FULL} (
                symbol TEXT,
                datetime INTEGER,
                date TEXT,
                time TEXT,
                last_price REAL
            );
        `);
    }
    async createHotMktDataTable() {
        await this.dbHot.execAsync(`
            CREATE TABLE IF NOT EXISTS ${TABLE_MARKET_DATA_RUNTIME} (
                symbol TEXT,
                datetime INTEGER,
                date TEXT,
                time TEXT,
                last_price REAL
            );
        `);
    }
    private async createCacheTableIfNotExists() {
        await this.dbHot.execAsync(`
            CREATE TABLE IF NOT EXISTS ${TABLE_SYMBOL_CACHE} (
                symbol TEXT,
                datetime INTEGER,
                date TEXT,
                time TEXT,
                last_price REAL
            );
        `);
    }
    async createFullMktIndex() {
        await this.dbCold.execAsync(`
            CREATE INDEX idx_symbol_date_time_${TABLE_MARKET_DATA_FULL} ON users(symbol, date, time);
        `)
    }
    async createHotMktIndex() {
        await this.dbHot.execAsync(`
            CREATE INDEX idx_symbol_date_time_${TABLE_MARKET_DATA_RUNTIME} ON users(symbol, date, time);
        `)
    }
}