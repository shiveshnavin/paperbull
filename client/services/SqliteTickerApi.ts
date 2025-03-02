import { SQLiteDatabase } from 'expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { Snapshot, TickerApi } from './TickerApi';
import * as FileSystem from 'expo-file-system';
import { PickedFile } from '../components/filepicker/FilePickerProps';
import { Tick } from './models/Tick';

const CHUNK_SIZE = 512 * 1024; // 64KB chunks
const BATCH_SIZE = 200;    // Number of records per insert batch
const TABLE_NAME = 'market_data'
export type MarketDataRow = {
    symbol: string
    datetime: number
    date: string
    time: string
    last_price: number
}
export class SqliteTickerApi extends TickerApi {
    db!: SQLiteDatabase;


    constructor(timeframe: "realtime" | "1s" | "10s" | "1m" | "10m" = 'realtime') {
        super(timeframe)
    }

    async subscribe(instrumentToken: string[]) {

    }

    async listen(onTick: (ticks: Tick[]) => void) {

    }

    async seekForward(date: string, time: string, processIntermediates = true) {
        // calls the onTick function with the ticks with timeframe sampling
    }

    async seekBack(date: string, time: string) {

    }

    async clearDb() {

        await this.db?.execAsync(`DELETE from symbol_cache WHERE 1 = 1`)
        return this.db?.execAsync(`DROP TABLE IF EXISTS ${TABLE_NAME}`)
    }

    async getDataSize(date?: string, time?: string): Promise<number> {
        let query = `SELECT count(*) as cnt FROM ${TABLE_NAME} m `;
        if (date) {
            query = query + `WHERE date = '${date}'`
        }
        if (time) {
            query = query + ` AND date = '${time}'`
        }
        const result: any = await this.db.getFirstAsync(query);
        return result.cnt;
    }
    private async getFromCache(date?: string): Promise<MarketDataRow[]> {
        const query = date
            ? `SELECT * FROM symbol_cache WHERE date = ?;`
            : `SELECT * FROM symbol_cache;`;
        const result: MarketDataRow[] = await this.db.getAllAsync(query, date ? [date] : []);
        return result
    }

    private async updateCache(rows: MarketDataRow[]): Promise<void> {
        const query = `
        INSERT OR REPLACE INTO symbol_cache (symbol, datetime, date, time, last_price)
        VALUES (?, ?, ?, ?, ?);
    `;
        for (const row of rows) {
            await this.db.runAsync(query, [
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
        const result: MarketDataRow[] = await this.db.getAllAsync(query);
        const ticks = result.map(this.mapDbRowToTick);
        await this.updateCache(result);

        return ticks;
    }

    async getSnapShot(date: string, time: string): Promise<Snapshot> {
        if (this.snapshot?.date == date
            && this.snapshot.time == time
            && this.snapshot.ticks?.length > 0) {
            return this.snapshot
        }
        if (this.symbols.length == 0) {

        }
        const placeholders = this.symbols.map(() => '?').join(',');
        let query = `
            SELECT m.* FROM ${TABLE_NAME} m
            INNER JOIN (
                SELECT symbol, MAX(datetime) AS max_datetime
                FROM ${TABLE_NAME}
                WHERE symbol IN (${placeholders})
                GROUP BY symbol
            ) latest 
            ON m.symbol = latest.symbol 
            AND m.datetime = latest.max_datetime
        `;

        const result: any = await this.db.getAllAsync(query, this.symbols);
        let ticks = result.map(this.mapDbRowToTick);
        let snapshot = {
            date,
            time,
            ticks
        } as Snapshot
        return snapshot
    }

    private mapDbRowToTick(row: any): Tick {
        return new Tick(row)
    }

    async init() {
        if (!this.db) {
            this.db = await SQLite.openDatabaseAsync('market_data.sqlite');
            await this.createCacheTableIfNotExists()
            await this.createTable()
            await this.createIndex()
        }
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
        await this.createTable()
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

        await this.db.runAsync(sql, params);
    }

    async createTable() {
        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
                symbol TEXT,
                datetime INTEGER,
                date TEXT,
                time TEXT,
                last_price REAL
            );
        `);
    }
    private async createCacheTableIfNotExists() {
        await this.db.execAsync(`
            CREATE TABLE IF NOT EXISTS symbol_cache (
                symbol TEXT,
                datetime INTEGER,
                date TEXT,
                time TEXT,
                last_price REAL
            );
        `);
    }
    async createIndex() {
        await this.db.execAsync(`
            CREATE INDEX idx_symbol_date_time_${TABLE_NAME} ON users(symbol, date, time);
        `)
    }
}