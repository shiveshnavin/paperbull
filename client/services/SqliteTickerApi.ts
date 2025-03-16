import { SQLiteDatabase } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';


import { Resolution, Snapshot, TickerApi } from './TickerApi';
import { PickedFile } from '../components/filepicker/FilePickerProps';
import { Tick } from './models/Tick';
import { PerformanceRecorder } from '../utils/PerformanceRecorder';

const CHUNK_SIZE = 512 * 1024; // 64KB chunks
const BATCH_SIZE = 200;    // Number of records per insert batch

const TABLE_MARKET_DATA_FULL = 'microticks_export'
const TABLE_SYMBOL_CACHE = 'symbol_cache'
const TABLE_MARKET_DATA_RUNTIME = 'microticks_export_runtime'

export type MarketDataRow = {
    symbol: string
    datetime: number
    date: string
    time: string
    last_price: number
}

export type SqliteFileMeta = {
    file: string
    size: number,
    count: number
    dates: string[]
}
export class SqliteTickerApi extends TickerApi {
    datasets!: (SqliteFileMeta & { db: SQLiteDatabase })[]
    dbCold!: SQLiteDatabase;
    dbHot!: SQLiteDatabase;

    constructor(timeframe: Resolution = 'realtime') {
        super(timeframe)
    }

    async init(datasets?: SqliteFileMeta[]) {
        if (!this.dbCold) {
            this.dbCold = await SQLite.openDatabaseAsync('market_data.sqlite');
            this.dbHot = await SQLite.openDatabaseAsync('market_data_runtime.sqlite');
            await this.dbCold.execAsync('PRAGMA journal_mode = WAL');
            await this.dbCold.execAsync('PRAGMA foreign_keys = ON');

            await this.createCacheTableIfNotExists()
            await this.createFullMktDataTable()
            await this.createFullMktIndex()

            await this.createHotMktDataTable()
            await this.createHotMktIndex()
        }
        let healthyDatasets: SqliteFileMeta[] = []
        if (datasets && !this.datasets) {
            this.datasets = []
            for (const ds of datasets) {
                try {
                    let info = await FileSystem.getInfoAsync(ds.file);
                    if (info.exists) {
                        let db = await SQLite.openDatabaseAsync(ds.file);
                        this.datasets.push({ ...ds, db });
                        healthyDatasets.push(ds);
                    }
                } catch (e: any) {
                    console.log('Error loading saved datasets', e.message);
                }
            }
        }
        // console.log('saved dataests', datasets)
        // console.log('healthy dataests', healthyDatasets)
        return healthyDatasets
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
                // console.log("subscription cancelled");
                isCancelled = true;
            });
        }

        // Convert resolution to an interval in milliseconds.
        let resolutionInterval: number | null = 0;
        if (resolution !== "realtime") {
            resolutionInterval = this.parseResolution(resolution)
        }

        // Build the base query with parameter placeholders.
        const perf = new PerformanceRecorder()
        const tokensPlaceholder = instrumentTokens.map(() => '?').join(',');


        // Optionally, get total row count for progress updates.
        let totalRows = 0;
        try {
            perf.start('subscribe-count')
            const countQuery = `
            SELECT COUNT(*) as count 
            FROM ${TABLE_MARKET_DATA_FULL} 
            WHERE symbol IN (${tokensPlaceholder})
          `;
            const countResult: any[] = await this.dbCold.getAllAsync(countQuery, instrumentTokens);
            totalRows = countResult[0].count;
            perf.stop('subscribe-count').log('subscribe-count')

        } catch (error) {
            console.error("Error fetching total count. Progress may not be accurate.", error);
        }

        let processed = 0;
        const batchSize = 5000;
        let offset = 0;
        // Keep track of the last accepted datetime for each symbol.
        const lastCopied: { [symbol: string]: number } = {};
        let inserts = 0
        if (onProgress) onProgress(processed, totalRows);

        // Process the data in batches.
        let lastInsert: MarketDataRow | undefined = undefined
        try {
            await this.deleteHotMktIndex()
            await this.dbHot.execAsync("PRAGMA synchronous = OFF;");
            await this.dbHot.execAsync("PRAGMA journal_mode = MEMORY;");
            await this.dbHot.execAsync("PRAGMA temp_store = MEMORY;");
            await this.dbHot.execAsync("PRAGMA locking_mode = EXCLUSIVE;");
        } catch (e: any) {
            console.log('Perf optimization during subscribe failed', e.message)
        }

        while (!isCancelled) {
            perf.start('subscribe-batch')

            perf.start('subscribe-batch-read')
            let baseQuery = `
            SELECT symbol, datetime, date, time, last_price 
            FROM ${TABLE_MARKET_DATA_FULL} 
            WHERE symbol IN (${tokensPlaceholder}) 
            ORDER BY symbol, datetime ASC
          `;
            let batchQuery = `${baseQuery} LIMIT ${batchSize}`;// OFFSET ${offset}
            if (lastInsert) {
                baseQuery = `
                SELECT symbol, datetime, date, time, last_price 
                FROM ${TABLE_MARKET_DATA_FULL} 
                WHERE symbol IN (${tokensPlaceholder}) AND (symbol, datetime) > ('${lastInsert.symbol}', '${lastInsert.datetime}')
                ORDER BY symbol, datetime ASC
              `;
                batchQuery = `${baseQuery} LIMIT ${batchSize}`;// OFFSET ${offset}

            }

            const explainQuery = `EXPLAIN QUERY PLAN ${batchQuery}`
            const explainQueryResult: any = await this.dbCold.getAllAsync(explainQuery);
            console.log('batchQuery', batchQuery)
            console.log('explainQueryResult', explainQueryResult)

            const batch: any[] = await this.dbCold.getAllAsync(batchQuery, instrumentTokens);
            perf.stop('subscribe-batch-read').log('subscribe-batch-read')

            if (batch.length === 0) {
                break;
            }
            const toInsertBatch: any[] = [];

            for (const row of batch) {
                if (isCancelled) {
                    // console.log("Operation cancelled. Exiting subscription loop.");
                    break;
                }

                const symbol = row.symbol;
                // Apply resolution filtering if needed.
                if (resolutionInterval !== null) {
                    const lastTime = lastCopied[symbol] || 0;
                    if (row.datetime - lastTime < resolutionInterval) {
                        processed++;
                        if (onProgress) onProgress(processed, totalRows);
                        continue;
                    }
                    lastCopied[symbol] = row.datetime;
                }

                // Insert the row into the runtime (hot) database.
                toInsertBatch.push(row);
                lastInsert = row

                if (onProgress) onProgress(processed, totalRows);
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
                perf.start('subscribe-batch-write')
                await this.dbHot.withTransactionAsync(async () => {
                    await this.dbHot.runAsync(sql, params);
                });
                perf.stop('subscribe-batch-write').log('subscribe-batch-write')
                perf.stop('subscribe-batch').log('subscribe-batch')

            }

            if (onProgress) onProgress(processed, totalRows);
            if (batch.length < batchSize) break;
            offset += batchSize;
        }

        this.createHotMktIndex()
        console.log('subscribed ', inserts, 'data points captured in hot db')
    }

    async clearCache() {
        await this.dbHot?.execAsync(`DELETE from symbol_cache WHERE 1 = 1`)
    }

    async clearDb() {
        await this.clearCache()
        return Promise.all([
            this.dbCold?.execAsync(`DROP TABLE IF EXISTS ${TABLE_MARKET_DATA_FULL}`),
            this.dbHot?.execAsync(`DROP TABLE IF EXISTS ${TABLE_MARKET_DATA_RUNTIME}`)
        ])
    }

    async getNextTicks(datetimefrom: number, limit: number, onTick: (ticks: Tick[]) => Promise<void>)
        : Promise<number> {
        let totalFetched = 0;

        const tokensPlaceholder = this.symbols.map(() => '?').join(',');
        const query = `
                SELECT * FROM ${TABLE_MARKET_DATA_FULL} 
                WHERE (datetime >= ${datetimefrom} )
                AND symbol in (${tokensPlaceholder})
                ORDER BY datetime ASC
                LIMIT ${limit}
            `;

        let dum = new Tick({
            datetime: datetimefrom
        })
        // console.log('query', dum.getTime(), query)

        const result: any = await this.dbCold.getAllAsync(query, this.symbols);
        let ticks = result.map(this.mapDbRowToTick);

        await onTick(ticks);
        // console.log('query', datetimefrom, dum.getTime(), datetimeto, dum2.getTime(), '->', ticks.length)

        totalFetched += ticks.length;

        return totalFetched;
    }

    generateDateArray(datetimeFrom: number, datetimeTo: number) {
        const fromDate = new Date(datetimeFrom);
        const toDate = new Date(datetimeTo);
        const dateArray = [];

        while (fromDate <= toDate) {
            dateArray.push(fromDate.toISOString().split('T')[0]); // Format as "YYYY-MM-DD"
            fromDate.setDate(fromDate.getDate() + 1); // Move to next day
        }

        return dateArray;
    }

    async getTicks(datetimefrom: number, datetimeto: number, onTick: (ticks: Tick[]) => Promise<void>)
        : Promise<number> {


        const batchSize = 5000; // Define batch size
        let offset = 0;
        let totalFetched = 0;
        const tokensPlaceholder = this.symbols.map(() => '?').join(',');

        const perf = new PerformanceRecorder()
        while (true) {
            const query = `
            SELECT * FROM ${TABLE_MARKET_DATA_FULL} 
            WHERE (datetime >= ${datetimefrom} )
            AND (datetime <= ${datetimeto} )
            AND symbol in (${tokensPlaceholder})
            ORDER BY datetime ASC
            LIMIT ${batchSize} OFFSET ${offset}
        `;

            let dum = new Tick({
                datetime: datetimefrom
            })
            let dum2 = new Tick({
                datetime: datetimeto
            })
            // console.log('query', dum.getTime(), dum2.getTime(), query, this.symbols)

            perf.start('get-ticks')
            let dates = this.generateDateArray(datetimefrom, datetimeto)
            let result: any[] = [];
            for (let date of dates) {
                let dateResult = await this.runOpOnDataset(date, db => db.getAllAsync(query, this.symbols))
                result = result.concat(dateResult)
            }
            let ticks = result.map(this.mapDbRowToTick);
            perf.stop('get-ticks').log('get-ticks')

            // console.log('query', datetimefrom, dum.getTime(), datetimeto, dum2.getTime(), '->', ticks.length)
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
        let count = result.cnt;
        for (let dataset of this.datasets) {
            try {
                let db = dataset.db
                let resultForDataset: any = await db.getFirstAsync(query);
                count += (resultForDataset.cnt || 0)
            } catch (e: any) {
                console.log(`Error in getDataSize for ${dataset.dates}`, e.message)
            }
        }

        return count;
    }
    private async getFromCache(date?: string): Promise<MarketDataRow[]> {
        const query = date
            ? `SELECT * FROM symbol_cache WHERE date = ?;`
            : `SELECT * FROM symbol_cache;`;
        const result: MarketDataRow[] = await this.dbHot.getAllAsync(query, date ? [date] : []);
        return result
    }

    private async updateCache(rows: MarketDataRow[]): Promise<void> {
        const placeholders = rows.map(() => '(?, ?, ?, ?, ?)').join(',');
        const sql = `
            INSERT OR REPLACE INTO ${TABLE_SYMBOL_CACHE} (symbol, datetime, date, time, last_price) 
            VALUES ${placeholders}
        `;

        const params = rows.flatMap(row => [
            row.symbol,
            row.datetime,
            row.date,
            row.time,
            row.last_price,
        ]);

        await this.dbHot.runAsync(sql, params);
    }

    async getAvailableSymbols(date?: string, skipCache?: boolean): Promise<Tick[]> {
        const cachedResults = await this.getFromCache(date);

        // console.log('Cached symbols', cachedResults.length)
        if (cachedResults.length > 0 && !skipCache) {
            return cachedResults.map(this.mapDbRowToTick);
        }
        if (skipCache) {
            await this.clearCache()
        }
        let query = `
            SELECT *
                FROM ${TABLE_MARKET_DATA_FULL}
                WHERE (symbol, datetime) IN (
                    SELECT symbol, MAX(datetime)
                    FROM ${TABLE_MARKET_DATA_FULL}
                    ${date ? `WHERE date = '${date}'` : ''}  
                    GROUP BY symbol
                );
        `;
        let result: MarketDataRow[] = await this.dbCold.getAllAsync(query);
        let datasetForDates = this.datasets.filter(ds => !date || ds.dates.includes(date))
        console.log(`search for symbols in `, datasetForDates.length, 'datasets')

        for (let dataset of datasetForDates) {
            try {
                let db = dataset.db
                let resultForDataset: MarketDataRow[] = await db.getAllAsync(query);
                console.log(`result in getAvailableSymbols for ${dataset.dates}`, resultForDataset.length)
                result.push(...resultForDataset)
            } catch (e: any) {
                console.log(`Error in getAvailableSymbols for ${dataset.dates}`, e.message)
            }
        }
        console.log('got total synbols', result.length)
        const uniqueResult = Array.from(
            new Map(result.map(obj => [obj.symbol, obj])).values()
        );
        console.log('got total unqiue synbols', uniqueResult.length)

        const ticks = uniqueResult.map(this.mapDbRowToTick);
        await this.updateCache(uniqueResult);
        console.log('updating cache', uniqueResult.length)

        return ticks;
    }

    async getSnapShot(date: string, time: string, force?: boolean): Promise<Snapshot> {
        if (!force && (this.snapshot?.date == date
            && this.snapshot.time == time
            && this.snapshot.ticks?.length > 0)) {
            return this.snapshot
        }

        const placeholders = this.symbols.map(() => '?').join(',');
        let query = `
            SELECT m.* FROM ${TABLE_MARKET_DATA_FULL} m
             INNER JOIN (
                SELECT symbol, MAX(datetime) AS max_datetime
                FROM ${TABLE_MARKET_DATA_FULL}
                WHERE symbol IN (${placeholders})
                AND ( date = '${date}' AND time <= '${time}')
                GROUP BY symbol
            ) latest 
            ON m.symbol = latest.symbol 
            AND m.datetime = latest.max_datetime
        `;

        const result: any = await this.runOpOnDataset(date, db => db.getAllAsync(query, this.symbols));
        console.log(query, this.symbols)
        console.log('Snapshot Results', result.length)

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

    async runOpOnDataset(date: string, op: (db: SQLiteDatabase) => Promise<any>): Promise<any> {
        let dataset = this.datasets.find(ds => ds.dates.includes(date))
        // console.log('matching dataset', this.datasets.find(ds => ds.dates.includes(date))?.dates)
        if (!dataset) {
            return op(this.dbCold)
        }
        // console.log('Running OP on dataset', dataset.dates)
        return op(dataset.db)
    }

    async loadFromSqlite(file: PickedFile,
        onProgress?: (progress: number, total: number) => void) {
        let fileName = file.name
        let fileUri = file.uri
        onProgress && onProgress(0, 1)
        const destinationUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.copyAsync({
            from: fileUri,
            to: destinationUri,
        });

        let ds = {
            file: destinationUri,
            size: file.size
        } as SqliteFileMeta
        let db = await SQLite.openDatabaseAsync(ds.file)
        const countQuery = `SELECT COUNT(*) as count FROM ${TABLE_MARKET_DATA_FULL}`;
        const countResult: any[] = await db.getAllAsync(countQuery);
        let totalRows = countResult[0].count;
        onProgress && onProgress(totalRows, totalRows)

        const dates: any[] = await db.getAllAsync(`
        SELECT distinct(date) as date 
        FROM ${TABLE_MARKET_DATA_FULL} `);

        ds.count = totalRows
        ds.dates = dates.map(d => d.date)
        this.datasets.push({ ...ds, db })
        return ds
    }

    async test() {

        // console.log('run test quer 5');

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
            // console.log('Ingestion cancelled')
            isCancelled = true
        })
        const path = file.uri
        await this.createFullMktDataTable()
        console.log('Loading CSV from ', path)

        const fileInfo = await FileSystem.getInfoAsync(path);
        // console.log('fileInfo', fileInfo)

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
        const sql = `INSERT INTO ${TABLE_MARKET_DATA_FULL} (symbol, datetime, date, time, last_price) VALUES ${placeholders}`;

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
        `)
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
        console.log('Creating cold index')
        await Promise.all([
            this.dbCold.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_symbol ON ${TABLE_MARKET_DATA_FULL}(symbol);
            `),

            this.dbCold.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_symbol_datetime  ON ${TABLE_MARKET_DATA_FULL}(symbol, datetime);
            `),
            this.dbCold.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_symbol_date_and_time  ON ${TABLE_MARKET_DATA_FULL}(symbol, date, time);
            `),
            this.dbCold.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_symbol_date_time_datetime   ON ${TABLE_MARKET_DATA_FULL}(symbol, date, time, datetime);
            `)
        ]).then(() => {
            console.log('createFullMktIndex compelted ')
        }).catch(e => {
            console.log('Creating index failed', e.message)

            e.message = "createFullMktIndex: " + e.message
            this.onError && this.onError(e)
        })

    }
    async deleteHotMktIndex() {
        try {
            await this.dbHot.execAsync(`
            DROP INDEX IF  EXISTS idx_symbol;
        `)
            await this.dbHot.execAsync(`
            DROP INDEX IF  EXISTS idx_symbol_datetime;
        `)
            await this.dbHot.execAsync(`
            DROP INDEX IF  EXISTS idx_symbol_date_and_time;
        `)
            await this.dbHot.execAsync(`
            DROP INDEX IF  EXISTS idx_symbol_date_time_datetime;
        `)
            console.log('deleteHotMktIndex compelted ')

        } catch (e: any) {
            console.log('deleteHotMktIndex failed ', e.message)

        }

    }
    async createHotMktIndex() {
        console.log('Creating hot data index')
        await Promise.all([
            this.dbHot.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_symbol ON ${TABLE_MARKET_DATA_RUNTIME}(symbol);
            `),

            this.dbHot.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_symbol_datetime  ON ${TABLE_MARKET_DATA_RUNTIME}(symbol, datetime);
            `),
            this.dbHot.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_symbol_date_and_time  ON ${TABLE_MARKET_DATA_RUNTIME}(symbol, date, time);
            `),
            this.dbHot.execAsync(`
                CREATE INDEX IF NOT EXISTS idx_symbol_date_time_datetime   ON ${TABLE_MARKET_DATA_RUNTIME}(symbol, date, time, datetime);
            `)
        ]).then(() => {
            console.log('createHotMktIndex compelted ')
        }).catch(e => {
            console.log('Creating index failed', e.message)

            e.message = "createHotMktIndex: " + e.message
            this.onError && this.onError(e)
        })
    }
}