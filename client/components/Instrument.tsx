import { Caption, CardView, HBox, TextView, ThemeContext, TitleText, VBox } from "react-native-boxes";
import { Tick } from "../services/models/Tick";
import { useContext } from "react";

export function ScipDisplay(props: {
    tick: Tick,
    prevTick: Tick
}) {
    const theme = useContext(ThemeContext)
    const change = props.tick.change || (props.tick.last_price - props.prevTick.last_price)
    const changeSymbol = change >= 0 ? "+" : "-"
    const changePer = change * 100 / (props.prevTick || props.tick).last_price
    return (
        <CardView style={{
            margin: theme.dimens.space.sm,
            marginTop: 0
        }}>
            <HBox style={{
                justifyContent: 'space-between'
            }}>
                <VBox>
                    <TitleText>{props.tick.getReadableName()}</TitleText>
                    <Caption>{props.tick.getType()}</Caption>
                </VBox>
                <VBox style={{
                    alignItems: 'flex-end',
                }}>
                    <TextView style={{
                        color: change >= 0 ? theme.colors.success : theme.colors.critical,
                    }}>{props.tick.last_price}</TextView>
                    <Caption>{changeSymbol}{change}  ({changeSymbol}{changePer.toFixed(2)})</Caption>
                </VBox>
            </HBox>
        </CardView>
    )
}