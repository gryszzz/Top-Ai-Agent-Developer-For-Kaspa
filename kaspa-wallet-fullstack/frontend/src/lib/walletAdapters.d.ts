export type WalletType = "kasware" | "kastle" | "kaspium" | "kng_web" | "kng_mobile" | "ledger_kasvault" | "cli_wallet";
export type WalletNetworkFamily = "mainnet" | "testnet" | "devnet" | "simnet" | "unknown";
export type KaswareSignMessageType = "auto" | "ecdsa" | "schnorr";
type KaswareProvider = {
    requestAccounts: () => Promise<string[]>;
    getAccounts?: () => Promise<string[]>;
    getPublicKey?: () => Promise<string>;
    signMessage?: (message: string, params?: {
        type?: KaswareSignMessageType;
        noAuxRand?: boolean;
    } | KaswareSignMessageType) => Promise<string | {
        signature?: string;
    }>;
    signData?: (message: string) => Promise<string | {
        signature?: string;
    }>;
    getNetwork?: () => Promise<string>;
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};
type KastleProvider = {
    connect: () => Promise<boolean>;
    getAccount: () => Promise<{
        address: string;
        publicKey?: string;
    }>;
    signMessage: (message: string) => Promise<string>;
    request?: (method: string, args?: unknown) => Promise<unknown>;
};
type KaswareEventHandlers = {
    onAccountsChanged?: (accounts: string[]) => void;
    onNetworkChanged?: (network: string) => void;
};
declare global {
    interface Window {
        kasware?: KaswareProvider;
        kastle?: KastleProvider;
    }
}
export declare function hasKaswareProvider(): boolean;
export declare function getKaswareProvider(): KaswareProvider | undefined;
export declare function hasKastleProvider(): boolean;
export declare function getKastleProvider(): KastleProvider | undefined;
export declare function subscribeKaswareEvents(handlers: KaswareEventHandlers): () => void;
type ConnectKaswareOptions = {
    requestPermission?: boolean;
    preferredAddress?: string;
};
export declare function waitForKaswareProvider(timeoutMs?: number, pollIntervalMs?: number): Promise<boolean>;
export declare function waitForKastleProvider(timeoutMs?: number, pollIntervalMs?: number): Promise<boolean>;
export declare function resolveWalletNetworkFamily(value?: string): WalletNetworkFamily;
export declare function areNetworksCompatible(walletNetwork: string | undefined, appNetwork: string | undefined): boolean;
export declare function connectKasware(options?: ConnectKaswareOptions): Promise<{
    address: string;
    publicKey?: string;
    network?: string;
}>;
export declare function connectKastle(): Promise<{
    address: string;
    publicKey?: string;
    network?: string;
}>;
export declare function signKaswareMessage(message: string): Promise<string>;
export declare function signKastleMessage(message: string): Promise<string>;
export declare function buildKaspaUri(address: string, amountKas?: string, note?: string): string;
export {};
