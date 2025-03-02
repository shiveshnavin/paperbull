import { useContext, useEffect } from "react";
import { ButtonView, PressableView, ThemeContext, TransparentButton, VBox } from "react-native-boxes";
import React from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
//@ts-ignore
import base64Decoder from 'react-native-base64';
import { FilePickerProps, FileTypes, PickedFile } from "./FilePickerProps";
import * as RNFS from 'react-native-fs'
export { PickedFile } from './FilePickerProps'
import * as RNFA from 'react-native-file-access';

export function FilePicker(props: FilePickerProps) {
    const { text, onFiles, onPickStart, auto, type, viewType, style } = props
    const theme = useContext(ThemeContext);
    const handleFileSelection = async () => {
        onPickStart && onPickStart()
        const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: false,
            type: type?.mime || FileTypes.Others.mime,
            multiple: props.multiple
        });

        if (result.assets == null) {
            onFiles([])
            return;
        }


        const files = await Promise.all(result.assets.map(async (file: any) => {
            const reader = {
                getChunk: async (offset: number, chunkSize: number) => {
                    try {
                        const fileUri = file.uri;
                        const base64 = await RNFS.read(fileUri, chunkSize, offset, FileSystem.EncodingType.UTF8);
                        return base64
                    } catch (error) {
                        throw new Error('Error reading chunk:' + error)
                    }
                }
            };

            const stat = await RNFA.FileSystem.stat(file.uri)
            const fileData: PickedFile = {
                id: `${Date.now()}`,
                mimeType: file.mimeType as string,
                //@ts-ignore
                name: stat.filename || file.name || file.fileName || `${Date.now()}.dat`,
                //@ts-ignore
                size: Math.abs(stat.size || file.size as number || file.fileSize || 1),
                uri: file.uri,
                updated: `${stat.lastModified || Date.now()}`,
                reader
            };
            return fileData;
        }));

        onFiles(files);
    };

    useEffect(() => { auto && handleFileSelection() }, [auto])

    if (viewType == 'graphic') {
        return (
            <PressableView
                onPress={handleFileSelection}
            >
                <VBox style={{
                    borderColor: theme.colors.accent,
                    marginTop: theme.dimens.space.md,
                    padding: theme.dimens.space.lg,
                    paddingTop: theme.dimens.space.xl,
                    paddingBottom: theme.dimens.space.xl,
                    borderRadius: theme.dimens.space.md,
                    borderStyle: 'dashed',
                    borderWidth: theme.dimens.space.xs
                }}>
                    <ButtonView
                        disabled={true}
                        icon="upload"
                        text={text}
                        style={{
                            borderColor: theme.colors.accent,
                            color: theme.colors.accent,
                            backgroundColor: theme.colors.transparent
                        }}
                    />

                </VBox>
            </PressableView>
        )
    }

    return (
        <TransparentButton
            underlayColor={theme.colors.background}
            style={[{
                color: theme.colors.text
            }, style as any]}
            onPress={handleFileSelection}
            text={text}
        />
    );
}
