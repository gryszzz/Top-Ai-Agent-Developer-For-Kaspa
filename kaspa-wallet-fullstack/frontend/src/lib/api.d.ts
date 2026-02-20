export type SessionWalletType = "kasware" | "kastle" | "kaspium" | "kng_web" | "kng_mobile" | "ledger_kasvault" | "cli_wallet";
export type NetworkResponse = {
    network: string;
    rpcTarget: string;
    allowedAddressPrefixes: string[];
    effectiveAddressPrefixes?: string[];
    monetization: {
        platformFeeEnabled: boolean;
        platformFeeBps: number;
        platformFeeMinKas: string;
        platformFeeRecipient: string;
    };
    runtime?: {
        store: "redis" | "memory";
        distributed: boolean;
    };
    wallets: {
        kasware: {
            injectedProvider: boolean;
            methods: string[];
        };
        kastle?: {
            injectedProvider: boolean;
            methods: string[];
        };
        kaspium: {
            injectedProvider: boolean;
            connectMode: string;
            uriScheme: string;
            recommendedAddressPrefixes?: string[];
        };
        kngWeb?: {
            injectedProvider: boolean;
            connectMode: string;
            note?: string;
        };
        kngMobile?: {
            injectedProvider: boolean;
            connectMode: string;
            note?: string;
        };
        ledgerKasvault?: {
            injectedProvider: boolean;
            connectMode: string;
            note?: string;
        };
        cliWallet?: {
            injectedProvider: boolean;
            connectMode: string;
            note?: string;
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
    walletType: SessionWalletType;
    verificationMode: "signature-verified" | "signature-unverified" | "manual";
    expiresInSeconds: number;
};
export type PaymentQuoteResponse = {
    network: string;
    walletType: SessionWalletType;
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
export type AgentRuntimeState = {
    address: string;
    network: string;
    mode: "observe" | "accumulate";
    running: boolean;
    intervalSeconds: number;
    cycles: number;
    startedAt?: string;
    lastTickAt?: string;
    lastKnownBalanceSompi?: string;
    lastKnownBalanceKas?: string;
    lastVirtualDaaScore?: string;
    nodeSynced?: boolean;
    lastError?: string;
    updatedAt: string;
};
export type AgentStateResponse = {
    address: string;
    network: string;
    state: AgentRuntimeState | null;
    timestamp: string;
};
export type AgentMutationResponse = {
    network: string;
    state: AgentRuntimeState;
    timestamp: string;
};
export type RealtimeStatsResponse = {
    network: string;
    node: {
        networkId: string;
        rpcApiVersion: number;
        rpcApiRevision: number;
        serverVersion: string;
        hasUtxoIndex: boolean;
        isSynced: boolean;
        virtualDaaScore: string;
    } | null;
    agents: {
        tracked: number;
        running: number;
        states: AgentRuntimeState[];
    };
    rpcPool?: Array<{
        target: string;
        score: number;
        inflight: number;
        consecutiveFailures: number;
        consecutiveSuccesses: number;
        totalRequests: number;
        circuitOpenUntil?: string;
        lastError?: string;
        lastFailureAt?: string;
        lastSuccessAt?: string;
    }>;
    error?: string;
    timestamp: string;
};
export declare function fetchNetwork(): Promise<NetworkResponse>;
export declare function fetchBalance(address: string): Promise<BalanceResponse>;
export declare function createWalletChallenge(address: string, walletType: SessionWalletType): Promise<WalletChallengeResponse>;
export declare function createWalletSession(payload: {
    nonce: string;
    signature?: string;
    publicKey?: string;
}): Promise<WalletSessionResponse>;
export declare function createPaymentQuote(payload: {
    fromAddress: string;
    toAddress: string;
    amountKas: string;
    walletType: SessionWalletType;
    note?: string;
}): Promise<PaymentQuoteResponse>;
export declare function fetchRealtimeStats(): Promise<RealtimeStatsResponse>;
export declare function openRealtimeStatsStream(handlers: {
    onSnapshot: (value: RealtimeStatsResponse) => void;
    onError?: (message: string) => void;
}): () => void;
export declare function fetchAgentState(address: string, sessionToken: string): Promise<AgentStateResponse>;
export declare function startAgentRuntime(payload: {
    address: string;
    mode: "observe" | "accumulate";
    intervalSeconds: number;
    sessionToken: string;
}): Promise<AgentMutationResponse>;
export declare function stopAgentRuntime(payload: {
    address: string;
    sessionToken: string;
}): Promise<AgentMutationResponse>;
