import { ButtonView, CardView, ThemeContext, TitleText, TransparentCenterToolbar, VPage } from "react-native-boxes";
import { useStyle } from "../../components/style";
import { useContext } from "react";
import { Button } from "react-native";
import { FilePicker } from "../../components/filepicker/FilePicker";
import { useEventPublisher } from "../../components/store";
import { Topic } from "../../components/EventListeners";

export default function Settings() {
    const theme = useContext(ThemeContext)
    const styles = useStyle(theme)
    const publisher = useEventPublisher()
    return (
        <VPage style={styles.container}>
            <TransparentCenterToolbar title="Settings" />
            <CardView>
                <TitleText>Load CSV</TitleText>
                <FilePicker
                    auto={false}
                    text="Select File"
                    onFiles={(files) => {
                        publisher(Topic.INGEST_CSV, files[0])
                    }}
                />
            </CardView>
        </VPage>
    )
}