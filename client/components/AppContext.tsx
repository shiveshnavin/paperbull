import React, { useContext } from "react";
import { Theme } from "react-native-boxes";
import { TickerApi } from "../services/TickerApi";

export class Context {
    theme!: Theme
    tickApi!: TickerApi
}


export const AppContext = React.createContext({
    context: new Context(),
    setContext: (context: Context) => { }
})