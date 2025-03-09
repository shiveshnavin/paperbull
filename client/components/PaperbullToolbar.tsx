import { Caption, Center, SimpleToolbarProps, TextView, ThemeContext, TitleText, TransparentCenterToolbar, VBox } from "react-native-boxes";
import { useStyle } from "./style";
import { useTheme } from "@react-navigation/native";
import { useContext } from "react";
import { AppContext } from "./AppContext";

export function PaperbullToolbar(props: SimpleToolbarProps & {
    time?: string,
    date?: string
}) {
    const theme = useContext(ThemeContext)
    const style = useStyle(theme)
    return (
        <VBox>
            <TransparentCenterToolbar {...props}

                title={(
                    <Center>
                        <TitleText style={style.nospaces}>{props.title}</TitleText>
                        {(props.time || props.date) && <Caption style={[style.nospaces, style.link]}>{props.date} at {props.time}</Caption>}
                    </Center>
                ) as any} />
        </VBox>
    )
}