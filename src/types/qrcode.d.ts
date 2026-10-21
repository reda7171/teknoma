declare module 'qrcode' {
    export interface QRCodeToDataURLOptions {
        type?: string;
        margin?: number;
        scale?: number;
        width?: number;
        errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';
        color?: {
            dark?: string;
            light?: string;
        };
    }

    export function toDataURL(text: string | Buffer, options?: QRCodeToDataURLOptions): Promise<string>;
    export function toDataURL(text: string | Buffer, callback: (error: Error | null | undefined, url: string) => void): void;
    export function toDataURL(text: string | Buffer, options: QRCodeToDataURLOptions, callback: (error: Error | null | undefined, url: string) => void): void;

    export function toString(text: string | Buffer, options?: any): Promise<string>;
    export function toBuffer(text: string | Buffer, options?: any): Promise<Buffer>;

    const qrcode: {
        toDataURL: typeof toDataURL;
        toString: typeof toString;
        toBuffer: typeof toBuffer;
    };

    export default qrcode;
}
