import { ButtonView, CardView, ThemeContext, TitleText, TransparentCenterToolbar, VPage } from "react-native-boxes";
import { useStyle } from "../../components/style";
import { useContext } from "react";
import { Button } from "react-native";
import { FilePicker } from "../../components/filepicker/FilePicker";

export default function Settings() {
    const theme = useContext(ThemeContext)
    const styles = useStyle(theme)
    return (
        <VPage style={styles.container}>
            <TransparentCenterToolbar title="Settings" />
            <CardView>
                <TitleText>Load CSV</TitleText>
                <FilePicker
                    text="Select File"
                    onFiles={(files) => {

                    }}
                />
            </CardView>
        </VPage>
    )
}