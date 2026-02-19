export type NetworkResponse = {
    network: string;
    rpcTarget: string;
    allowedAddressPrefixes: string[];
    wallets: {
        kasware: {
            injectedProvider: boolean;
            methods: string[];
        };
        kaspium: {
            injectedProvider: boolean;
            connectMode: string;
            uriScheme: string;
        };
    };
    timestamp: string;
};
export type BalanceResponse = {
    address: string;
    network: string;
    balanceSompi: string;
    balanceKas: string;
    timestamp: string;
};
export type WalletChallengeResponse = {
    nonce: string;
    message: string;
    expiresAt: string;
};
export type WalletSessionResponse = {
    token: string;
    address: string;
    walletType: "kasware" | "kaspium";
    verificationMode: "signature-verified" | "signature-unverified" | "manual";
    expiresInSeconds: number;
};
export declare function fetchNetwork(): Promise<NetworkResponse>;
export declare function fetchBalance(address: string): Promise<BalanceResponse>;
export declare function createWalletChallenge(address: string, walletType: "kasware" | "kaspium"): Promise<WalletChallengeResponse>;
export declare function createWalletSession(payload: {
    nonce: string;
    signature?: string;
    publicKey?: string;
}): Promise<WalletSessionResponse>;
