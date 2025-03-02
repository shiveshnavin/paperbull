import SQLite, { SQLiteDatabase } from 'expo-sqlite';
import { TickerApi } from './TickerApi';
import * as FileSystem from 'expo-file-system';




export class SqliteTickerApi extends TickerApi {

    db!: SQLiteDatabase

    async init() {
        this.db = await SQLite.openDatabaseAsync('market_data.sqlite');
    }

    async loadFromCsv() {

    }

    insertBatch = (batch: any) => {

    };

    createTable() {

    };

}