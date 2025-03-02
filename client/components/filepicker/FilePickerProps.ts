import { ViewStyle } from "react-native"

export type PickedFile = {
    id: string,
    mimeType: string,
    name: string,
    size: number,
    uri: string, // File Uri or Base64 Uri
    updated?: string
    webFile?: any
    reader: {
        getChunk: (offset: number, chunkSize: number) => Promise<Uint8Array>
    }
}
export type FilePickerProps = {
    text: string,
    type?: FileType
    onFiles: (files: PickedFile[]) => void,
    onPickStart?: () => void
    auto?: boolean
    viewType?: "button" | "graphic"
    style?: ViewStyle
}

export type FileType = {
    type: string,
    mime: string[],
    icon: string
}
export const FileTypes = {
    Camera: {
        type: 'Camera',
        mime: ['image/*', 'video/*'],
        icon: 'camera'
    },
    Images: {
        type: 'Images',
        mime: ['image/*'],
        icon: 'photo'
    },
    Others: {
        type: 'Others',
        mime: ['*/*'], // Wildcard for all types
        icon: 'file'
    },
    Docs: {
        type: 'Docs',
        mime: [
            'application/pdf',               // PDF
            'application/msword',            // Microsoft Word
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Microsoft Word (OpenXML)
            'application/vnd.ms-excel',      // Microsoft Excel
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Microsoft Excel (OpenXML)
            'application/vnd.ms-powerpoint', // Microsoft PowerPoint
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // Microsoft PowerPoint (OpenXML)
            'text/plain',                    // Plain Text
            'application/rtf',               // Rich Text Format
            'application/vnd.oasis.opendocument.text',  // OpenDocument Text
            'application/vnd.oasis.opendocument.spreadsheet', // OpenDocument Spreadsheet
            'application/vnd.oasis.opendocument.presentation' // OpenDocument Presentation
        ],
        icon: 'file-text'
    },
    Videos: {
        type: 'Videos',
        mime: ['video/*'],
        icon: 'video-camera'
    },
    Note: {
        type: 'Note',
        mime: ['text/txt', 'text/plain', 'text/*'],
        icon: 'font'
    },
    Link: {
        type: 'Link',
        mime: ['text/txt', 'text/plain', 'text/*'],
        icon: 'link'
    },
};


export function createTextFile(filename: string, content: string, mime: string): PickedFile {
    return {
        id: filename,
        mimeType: mime,
        name: filename,
        reader: {
            getChunk(offset: number, chunkSize: number) {
                if (offset >= content.length) {
                    return Promise.resolve(new Uint8Array(0));
                }
                const end = Math.min(offset + chunkSize, content.length);
                const chunk = content.slice(offset, end);
                const encoder = new TextEncoder();
                const chunkUint8Array = encoder.encode(chunk);

                return Promise.resolve(chunkUint8Array);
            }
        },
        size: content.length,
        uri: '',
        updated: `${Date.now()}`
    }
}