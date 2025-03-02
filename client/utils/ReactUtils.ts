import { Linking, Share as RNShare } from "react-native";
import { I18n, isDesktop, isNative, isWeb } from "react-native-boxes";
import { Buffer } from 'buffer'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native';

export { getNavParamsFromDeeplink } from 'react-native-boxes'

function base64ToBlob(base64: string): Blob {
    const [header, data] = base64.split(',');
    const mime = header?.match(/:(.*?);/)?.[1];
    const bytes = atob(data);
    const arrayBuffer = new ArrayBuffer(bytes.length);
    const uintArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.length; i++) {
        uintArray[i] = bytes.charCodeAt(i);
    }
    return new Blob([uintArray], { type: mime });
}
export const ReactUtils = {

    getWebOS(): "win" | "mac" | "linux" | "android" | "ios" | "unknown" {
        let os: any = "unknown";
        if (navigator.userAgent.indexOf("Win") != -1) os = "win";
        if (navigator.userAgent.indexOf("Mac") != -1) os = "mac";
        if (navigator.userAgent.indexOf("Linux") != -1) os = "linux";
        if (navigator.userAgent.indexOf("Android") != -1) os = "android";
        if (navigator.userAgent.indexOf("like Mac") != -1) os = "ios";
        return os
    },

    checkVersionOutdated(curVersionString: string, inputVersion: string): boolean {
        const curVersion = curVersionString.split('.').map(Number);
        const inputVersionArr = inputVersion.split('.').map(Number);

        const maxLength = Math.max(curVersion.length, inputVersionArr.length);

        for (let i = 0; i < maxLength; i++) {
            const curVerNum = curVersion[i] || 0;
            const inputVerNum = inputVersionArr[i] || 0;

            if (curVerNum < inputVerNum) {
                return true;
            } else if (curVerNum > inputVerNum) {
                return false;
            }
        }

        return false;
    },

    isLink(text?: string) {
        if (!text) {
            return false
        }
        return text.startsWith('http://') || text.startsWith('https://')
    },

    getUrlPath(url?: string) {
        if (!url) {
            return ""
        }
        const urlPattern = /^([a-zA-Z][a-zA-Z\d+\-.]*:\/\/)?([^\/\s]+\/)?(.*)/;
        const match = url.match(urlPattern);
        return match ? match[3] : url;
    },
    async generateSha1Digest(data: Uint8Array): Promise<string> {
        const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer as any);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    },

    capitalizeWords(str?: string) {
        if (!str) {
            return ""
        }
        return str.split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    },

    uint8ArrayToString(uint8Array: Uint8Array): string {
        let result = '';
        for (let i = 0; i < uint8Array.length; i++) {
            result += String.fromCharCode(uint8Array[i]);
        }
        return result;
    },

    canShare(title?: string, text?: string, url?: string, files?: File[]) {
        if (isNative()) {
            return true
        }

        if (isWeb() && !isDesktop()) {
            return navigator.canShare({
                files,
                text,
                title,
                url
            })
        }
        return false
    },
    async shareText(title: string, text: string) {
        if (isNative()) {
            RNShare.share({
                message: text,
                title
            })
        } else if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: text
                });
            } catch (error) {
                console.error("Error sharing content:", error);
            }
        }
    },
    guessFilenameFromUrl(url: string): string {
        const pathname = new URL(url).pathname;
        const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
        return filename || 'file';
    },
    refineString(str: string, replacementChar: string = '_') {
        const regexPattern = new RegExp(`[^a-zA-Z0-9]`, 'g');
        return str.replace(regexPattern, replacementChar);
    },

    async deleteCacheDirectory() {
        try {
            const cacheDirectory = FileSystem.cacheDirectory;
            if (!cacheDirectory) {
                return
            }
            const files = await FileSystem.readDirectoryAsync(cacheDirectory);
            for (const file of files) {
                const fileUri = `${cacheDirectory}${file}`;
                await FileSystem.deleteAsync(fileUri, { idempotent: true });
            }
        } catch (error) {
        }
    },
    async getDirectorySize(directoryUri?: string | null | undefined) {
        if (!directoryUri) {
            return 0
        }
        let totalSize = 0;

        try {
            const files = await FileSystem.readDirectoryAsync(directoryUri);

            for (const file of files) {
                const fileUri = `${directoryUri}${file}`;
                const fileInfo = await FileSystem.getInfoAsync(fileUri);

                if (fileInfo.isDirectory) {
                    // Recursively calculate the size of subdirectories
                    totalSize += await ReactUtils.getDirectorySize(fileUri + '/');
                } else {
                    //@ts-ignore
                    totalSize += fileInfo.size;
                }
            }
        } catch (error) {
            console.error('Error calculating directory size:', error);
        }

        return totalSize;
    },

    async getCacheDirectorySize() {
        const cacheDirectory = FileSystem.cacheDirectory;
        const cacheSize = await ReactUtils.getDirectorySize(cacheDirectory);
        return cacheSize;
    },


    base64EncodeUrlFriendly(str: string) {
        return Buffer.from(str, 'utf-8').toString('base64')
            .replaceAll("/", "_fws_")
    },

    base64DecodeUrlFriendly(str: string) {
        return Buffer.from(str.replaceAll("_fws_", "/"), 'base64').toString('utf-8')

    },

    base64Encode(str: string) {
        return Buffer.from(str, 'utf-8').toString('base64');
    },

    base64Decode(str: string) {
        return Buffer.from(str, 'base64').toString('utf-8');
    },

    openExternalUrl(url: string, fileName?: string) {
        if (isWeb()) {
            window.open(url, '_blank');
        } else {
            Linking.openURL(url);
        }
    },

    sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    },

    getRandomNumber(from: number, to: number): number {
        const range = to - from;
        const randomNumber = Math.random() * range + from;
        return randomNumber;
    },

    bytesToHumanReadable(bytes?: number | string, round?: boolean) {
        if (typeof bytes == "string")
            bytes = parseInt(bytes)
        if (bytes === 0 || bytes == undefined) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        let readableSize = parseFloat((bytes / Math.pow(k, i)).toFixed(round ? 0 : 1));
        return `${readableSize} ${sizes[i]}`;
    },
    getRelativeDuration(milisString?: string): string | undefined {
        if (!milisString) {
            return undefined
        }
        const givenTime = parseInt(milisString, 10);
        const now = Date.now();
        const difference = now - givenTime;

        const msPerMinute = 60 * 1000;
        const msPerHour = msPerMinute * 60;
        const msPerDay = msPerHour * 24;
        const msPerMonth = msPerDay * 30;
        const msPerYear = msPerDay * 365;

        if (difference < msPerMinute) {
            return `${Math.floor(difference / 1000)} seconds ago`;
        } else if (difference < msPerHour) {
            return `${Math.floor(difference / msPerMinute)} minutes ago`;
        } else if (difference < msPerDay) {
            return `${Math.floor(difference / msPerHour)} hours ago`;
        } else if (difference < msPerMonth) {
            return `${Math.floor(difference / msPerDay)} days ago`;
        } else if (difference < msPerYear) {
            return `${Math.floor(difference / msPerMonth)} months ago`;
        } else {
            return `${Math.floor(difference / msPerYear)} years ago`;
        }
    },

    validateBothPassword(password: string, re_password: string) {
        return password == re_password ? undefined : "Passwords do not match"
    },

    validateBothPasswordBool(password: string, re_password: string) {
        return password == re_password ? true : false
    },

    validatePassword(password: string, i18n: I18n) {

        const requirements = [
            {
                regex: /.{8,}/,
                message: i18n.t("changepassword.rule.rule1"),
                met: false
            },
            {
                regex: /[A-Z]/,
                message: i18n.t("changepassword.rule.rule2"),
                met: false
            },
            {
                regex: /[a-z]/,
                message: i18n.t("changepassword.rule.rule3"),
                met: false
            },
            {
                regex: /\d/,
                message: i18n.t("changepassword.rule.rule4"),
                met: false
            },
            {
                regex: /[!@#$%^&amp;*]/,
                message: i18n.t("changepassword.rule.rule5"),
                met: false
            },
            {
                regex: /^\S*$/,
                message: i18n.t("changepassword.rule.rule6"),
                met: false
            }
        ]

        requirements.forEach((requirement) => {
            requirement.met = requirement.regex.test(password)
        });

        return requirements.filter(requirement => !requirement.met).map((e) => e.message).join(".")

    }


}