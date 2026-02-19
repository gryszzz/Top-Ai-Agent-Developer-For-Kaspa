export type NetworkResponse = {
    network: string;
    rpcTarget: string;
    allowedAddressPrefixes: string[];
    monetization: {
        platformFeeEnabled: boolean;
        platformFeeBps: number;
        platformFeeMinKas: string;
        platformFeeRecipient: string;
    };
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
export type PaymentQuoteResponse = {
    network: string;
    walletType: "kasware" | "kaspium";
    fromAddress: string;
    toAddress: string;
    pricing: {
        platformFee: {
            recipientAddress: string;
            feeBps: number;
            minFeeKas: string;
            feeSompi: string;
            feeKas: string;
            amountSompi: string;
            amountKas: string;
            totalDebitSompi: string;
            totalDebitKas: string;
            applied: boolean;
            enabled: boolean;
        };
        disclosure: string;
    };
    paymentIntents: {
        primary: {
            toAddress: string;
            amountKas: string;
            uri: string;
        };
        platformFee: {
            toAddress: string;
            amountKas: string;
            uri: string;
        } | null;
    };
    timestamp: string;
};
export declare function fetchNetwork(): Promise<NetworkResponse>;
export declare function fetchBalance(address: string): Promise<BalanceResponse>;
export declare function createWalletChallenge(address: string, walletType: "kasware" | "kaspium"): Promise<WalletChallengeResponse>;
export declare function createWalletSession(payload: {
    nonce: string;
    signature?: string;
    publicKey?: string;
}): Promise<WalletSessionResponse>;
export declare function createPaymentQuote(payload: {
    fromAddress: string;
    toAddress: string;
    amountKas: string;
    walletType: "kasware" | "kaspium";
    note?: string;
}): Promise<PaymentQuoteResponse>;
