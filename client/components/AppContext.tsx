import React, { useContext } from "react";
import { Theme } from "react-native-boxes";
import { TickerApi } from "../services/TickerApi";
import { SqliteTickerApi } from "../services/SqliteTickerApi";

export class Context {
    theme!: Theme
    tickApi!: SqliteTickerApi
}


export const AppContext = React.createContext({
    context: new Context(),
    setContext: (context: Context) => { }
})