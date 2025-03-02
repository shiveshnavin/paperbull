import React, { useContext } from "react";
import { Theme } from "react-native-boxes";

export class Context {

    theme = new Theme()

}


export const AppContext = React.createContext({
    context: new Context(),
    setContext: (context: Context) => { }
})