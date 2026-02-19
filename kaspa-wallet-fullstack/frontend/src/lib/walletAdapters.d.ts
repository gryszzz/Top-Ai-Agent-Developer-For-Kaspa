export type WalletType = "kasware" | "kaspium";
type KaswareProvider = {
    requestAccounts: () => Promise<string[]>;
    getPublicKey?: () => Promise<string>;
    signMessage?: (message: string) => Promise<string | {
        signature?: string;
    }>;
    signData?: (message: string) => Promise<string | {
        signature?: string;
    }>;
    getNetwork?: () => Promise<string>;
};
declare global {
    interface Window {
        kasware?: KaswareProvider;
    }
}
export declare function hasKaswareProvider(): boolean;
export declare function connectKasware(): Promise<{
    address: string;
    publicKey?: string;
    network?: string;
}>;
export declare function signKaswareMessage(message: string): Promise<string>;
export declare function buildKaspaUri(address: string, amountKas?: string, note?: string): string;
export {};
