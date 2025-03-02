import SQLite, { SQLiteDatabase } from 'expo-sqlite';
import { TickerApi } from './TickerApi';
import * as FileSystem from 'expo-file-system';

const CHUNK_SIZE = 65536; // 64KB chunks
const BATCH_SIZE = 200;    // Number of records per insert batch

export class SqliteTickerApi extends TickerApi {
    db!: SQLiteDatabase;

    async init() {
        this.db = await SQLite.openDatabaseAsync('market_data.sqlite');
    }

    async loadFromCsv(path: string) {
        await this.createTable();
        const fileInfo = await FileSystem.getInfoAsync(path);

        if (!fileInfo.exists) {
            throw new Error(`File not found: ${path}`);
        }

        let position = 0;
        let remaining = '';
        let isFirstLine = true;
        let batch: any[] = [];

        while (position < fileInfo.size) {
            const chunk = await FileSystem.readAsStringAsync(path, {
                encoding: FileSystem.EncodingType.UTF8,
                position,
                length: CHUNK_SIZE,
            });

            const content = remaining + chunk;
            const lines = content.split('\n');
            remaining = lines.pop() || '';

            for (const line of lines) {
                if (isFirstLine) {
                    isFirstLine = false;
                    continue; // Skip header
                }

                const record = this.parseLine(line);
                if (record) {
                    batch.push(record);
                    if (batch.length >= BATCH_SIZE) {
                        await this.insertBatch(batch);
                        batch = [];
                    }
                }
            }

            position += CHUNK_SIZE;
        }

        // Process remaining content
        if (remaining && !isFirstLine) {
            const record = this.parseLine(remaining);
            if (record) batch.push(record);
        }

        // Insert final batch
        if (batch.length > 0) {
            await this.insertBatch(batch);
        }
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
            CREATE TABLE IF NOT EXISTS market_data (
                symbol TEXT,
                datetime INTEGER,
                date TEXT,
                time TEXT,
                last_price REAL
            );
        `);
    }
}