import { useContext, useEffect, useRef, useState } from "react";
import { ButtonView, PressableView, ThemeContext, VBox } from "react-native-boxes";
import React from 'react';
import { FilePickerProps, FileTypes, PickedFile } from "./FilePickerProps";
export { PickedFile } from './FilePickerProps'

export function FilePicker(props: FilePickerProps) {
    const { text, onFiles, onPickStart, auto, type, viewType, style } = props
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const theme = useContext(ThemeContext);
    const [startedAutoPicker, setStartedAutoPicker] = useState(false)
    useEffect(() => {
        if (fileInputRef?.current && !startedAutoPicker) {
            setStartedAutoPicker(true)
            fileInputRef.current?.click()
        }
    }, [auto, fileInputRef.current])

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const fileList = Array.from(files);
        const outputFileData: PickedFile[] = await Promise.all(fileList.map(async (file) => {
            const fileData: PickedFile = {
                id: file.name,
                mimeType: file.type,
                name: file.name,
                size: file.size,
                webFile: file,
                uri: URL.createObjectURL(file),
                reader: {
                    getChunk: (offset: number, chunkSize: number) => {
                        return new Promise<Uint8Array>((resolve, reject) => {
                            const reader = new FileReader();

                            reader.onload = (e: ProgressEvent<FileReader>) => {
                                if (e.target?.result instanceof ArrayBuffer) {
                                    resolve(new Uint8Array(e.target.result));
                                } else {
                                    reject(new Error("Failed to read file chunk"));
                                }
                            };

                            reader.onerror = (e) => {
                                reject(e || new Error("Failed to read file chunk"));
                            };

                            const blob = file.slice(offset, offset + chunkSize);
                            reader.readAsArrayBuffer(blob);
                        });
                    }
                }
            };
            return fileData;
        }));

        onFiles(outputFileData);
    };

    const Input = (
        <input
            capture={type?.type == FileTypes.Camera.type ? "environment" : undefined}
            accept={type?.mime?.join(',')}
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
        />
    )

    if (viewType == 'graphic') {
        return (
            <>
                <PressableView
                    onPress={() => {
                        onPickStart && onPickStart()
                        fileInputRef.current?.click()
                    }}
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
                {Input}
            </>
        )
    }
    return (
        <>
            <ButtonView
                underlayColor={theme.colors.background}
                style={{
                    color: theme.colors.text,
                    backgroundColor: theme.colors.semitransparent
                }}
                onPress={() => {
                    onPickStart && onPickStart()
                    fileInputRef.current?.click()
                }}
                text={text}
            />
            {Input}
        </>
    );
}
