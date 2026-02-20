import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAgentState,
  createPaymentQuote,
  createWalletChallenge,
  createWalletSession,
  fetchBalance,
  fetchNetwork,
  fetchRealtimeStats,
  startAgentRuntime,
  stopAgentRuntime,
  type AgentRuntimeState,
  type NetworkResponse,
  type PaymentQuoteResponse,
  type RealtimeStatsResponse
} from "./lib/api";
import {
  areNetworksCompatible,
  connectKastle,
  connectKasware,
  hasKastleProvider,
  getKaswareProvider,
  hasKaswareProvider,
  signKastleMessage,
  signKaswareMessage,
  subscribeKaswareEvents,
  type WalletType,
  waitForKastleProvider,
  waitForKaswareProvider
} from "./lib/walletAdapters";
import { useWalletStore } from "./state/walletStore";

const ADDRESS_BODY_PATTERN = /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/i;
const DEFAULT_ALLOWED_PREFIXES = ["kaspatest", "kaspa"];

type WalletSlotId =
  | "kasware"
  | "kastle"
  | "kaspium"
  | "kng-web"
  | "kng-mobile"
  | "ledger-kasvault"
  | "cli-wallet";

type WalletSlotConfig = {
  id: WalletSlotId;
  label: string;
  description: string;
  connectMode: "injected" | "address";
  docsUrl?: string;
  installUrl?: string;
};

const WALLET_SLOTS: WalletSlotConfig[] = [
  {
    id: "kasware",
    label: "Kasware",
    description: "Browser extension with injected provider and message signing.",
    connectMode: "injected",
    docsUrl: import.meta.env.VITE_WALLET_KASWARE_DOCS_URL || "https://github.com/kasware-wallet/extension",
    installUrl: import.meta.env.VITE_WALLET_KASWARE_INSTALL_URL || "https://github.com/kasware-wallet/extension"
  },
  {
    id: "kastle",
    label: "Kastle",
    description: "Injected provider flow (`window.kastle`) with signature auth.",
    connectMode: "injected",
    docsUrl: import.meta.env.VITE_WALLET_KASTLE_DOCS_URL || "https://kaspa.org/",
    installUrl: import.meta.env.VITE_WALLET_KASTLE_INSTALL_URL || "https://kaspa.org/"
  },
  {
    id: "kaspium",
    label: "Kaspium",
    description: "Mobile wallet flow via saved address + deeplink launch.",
    connectMode: "address",
    docsUrl: import.meta.env.VITE_WALLET_KASPIUM_DOCS_URL || "https://github.com/azbuky/kaspium_wallet",
    installUrl: import.meta.env.VITE_WALLET_KASPIUM_INSTALL_URL || "https://github.com/azbuky/kaspium_wallet"
  },
  {
    id: "kng-web",
    label: "KNG Web Wallet",
    description: "Address-backed session from KNG web wallet.",
    connectMode: "address",
    docsUrl: import.meta.env.VITE_WALLET_KNG_WEB_DOCS_URL || "https://kaspa.org/"
  },
  {
    id: "kng-mobile",
    label: "KNG Mobile Wallet",
    description: "Address-backed session from KNG mobile wallet.",
    connectMode: "address",
    docsUrl: import.meta.env.VITE_WALLET_KNG_MOBILE_DOCS_URL || "https://kaspa.org/"
  },
  {
    id: "ledger-kasvault",
    label: "Ledger + KASVault",
    description: "Hardware-backed addresses connected through KASVault export.",
    connectMode: "address",
    docsUrl: import.meta.env.VITE_WALLET_LEDGER_KASVAULT_DOCS_URL || "https://kaspa.org/"
  },
  {
    id: "cli-wallet",
    label: "Command Line Wallet",
    description: "Address-backed session for CLI / server wallet operations.",
    connectMode: "address",
    docsUrl: import.meta.env.VITE_WALLET_CLI_DOCS_URL || "https://kaspa.org/"
  }
];

const WALLET_SLOT_BY_ID: Record<WalletSlotId, WalletSlotConfig> = WALLET_SLOTS.reduce(
  (acc, slot) => {
    acc[slot.id] = slot;
    return acc;
  },
  {} as Record<WalletSlotId, WalletSlotConfig>
);

type AgentPreference = {
  mode: "observe" | "accumulate";
  intervalSeconds: number;
  autoResume: boolean;
};

const DEFAULT_AGENT_PREFERENCE: AgentPreference = {
  mode: "observe",
  intervalSeconds: 15,
  autoResume: true
};

function getAddressParts(value: string): { prefix: string; payload: string } | null {
  const trimmed = value.trim();
  const separatorIndex = trimmed.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === trimmed.length - 1) {
    return null;
  }

  return {
    prefix: trimmed.slice(0, separatorIndex).toLowerCase(),
    payload: trimmed.slice(separatorIndex + 1)
  };
}

function isAllowedKaspaAddress(value: string, allowedPrefixes: string[]): boolean {
  const parts = getAddressParts(value);
  if (!parts) {
    return false;
  }

  if (!allowedPrefixes.includes(parts.prefix)) {
    return false;
  }

  return ADDRESS_BODY_PATTERN.test(parts.payload);
}

function storageKeyForKaspiumAddress(network: string): string {
  return `kaspium.lastAddress.${network}`;
}

function readSavedKaspiumAddress(network: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  const saved = window.localStorage.getItem(storageKeyForKaspiumAddress(network));
  return saved?.trim() || "";
}

function saveKaspiumAddress(network: string, address: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKeyForKaspiumAddress(network), address.trim());
}

function storageKeyForAgentPreference(network: string, address: string): string {
  return `agent.preference.${network}.${address.trim().toLowerCase()}`;
}

function readAgentPreference(network: string, address: string): AgentPreference {
  if (typeof window === "undefined" || !address.trim()) {
    return DEFAULT_AGENT_PREFERENCE;
  }

  const raw = window.localStorage.getItem(storageKeyForAgentPreference(network, address));
  if (!raw) {
    return DEFAULT_AGENT_PREFERENCE;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AgentPreference>;
    const intervalSeconds = Number(parsed.intervalSeconds);
    return {
      mode: parsed.mode === "accumulate" ? "accumulate" : "observe",
      intervalSeconds: Number.isFinite(intervalSeconds) ? Math.min(300, Math.max(5, Math.floor(intervalSeconds))) : 15,
      autoResume: parsed.autoResume !== false
    };
  } catch {
    return DEFAULT_AGENT_PREFERENCE;
  }
}

function saveAgentPreference(network: string, address: string, value: AgentPreference): void {
  if (typeof window === "undefined" || !address.trim()) {
    return;
  }

  window.localStorage.setItem(
    storageKeyForAgentPreference(network, address),
    JSON.stringify({
      mode: value.mode,
      intervalSeconds: Math.min(300, Math.max(5, Math.floor(value.intervalSeconds))),
      autoResume: value.autoResume
    })
  );
}

function expectedPrefixesForNetwork(network: string): string[] {
  const normalized = network.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  if (normalized.includes("mainnet")) {
    return ["kaspa"];
  }

  if (normalized.includes("testnet")) {
    return ["kaspatest"];
  }

  if (normalized.includes("devnet")) {
    return ["kaspadev"];
  }

  if (normalized.includes("simnet")) {
    return ["kaspasim"];
  }

  return [];
}

function isAddressBackedSlot(slotId: WalletSlotId): boolean {
  return WALLET_SLOT_BY_ID[slotId].connectMode === "address";
}

function walletTypeForSlot(slotId: WalletSlotId): WalletType {
  if (slotId === "kasware" || slotId === "kastle") {
    return slotId;
  }

  return "kaspium";
}

export default function App() {
  const {
    walletType,
    address,
    status,
    publicKey,
    sessionToken,
    verificationMode,
    balanceKas,
    error,
    setWalletType,
    setConnecting,
    setConnection,
    resetConnection,
    setBalance,
    setError
  } = useWalletStore();

  const [networkInfo, setNetworkInfo] = useState<NetworkResponse | null>(null);
  const [walletSlot, setWalletSlot] = useState<WalletSlotId>("kasware");
  const [connectedWalletSlot, setConnectedWalletSlot] = useState<WalletSlotId | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("1.0");
  const [paymentDestination, setPaymentDestination] = useState("");
  const [paymentNote, setPaymentNote] = useState("Kaspa wallet transfer");
  const [paymentQuote, setPaymentQuote] = useState<PaymentQuoteResponse | null>(null);
  const [realtimeStats, setRealtimeStats] = useState<RealtimeStatsResponse | null>(null);
  const [agentRuntime, setAgentRuntime] = useState<AgentRuntimeState | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentMode, setAgentMode] = useState<"observe" | "accumulate">(DEFAULT_AGENT_PREFERENCE.mode);
  const [agentIntervalSeconds, setAgentIntervalSeconds] = useState<number>(DEFAULT_AGENT_PREFERENCE.intervalSeconds);
  const [agentAutoResume, setAgentAutoResume] = useState<boolean>(DEFAULT_AGENT_PREFERENCE.autoResume);
  const [kaswareReady, setKaswareReady] = useState(hasKaswareProvider());
  const [kaswareChecking, setKaswareChecking] = useState(!hasKaswareProvider());
  const [kastleReady, setKastleReady] = useState(hasKastleProvider());
  const [kastleChecking, setKastleChecking] = useState(!hasKastleProvider());
  const autoResumeAttemptedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchNetwork().then(setNetworkInfo).catch((err: Error) => setError(err.message));
  }, [setError]);

  useEffect(() => {
    let cancelled = false;
    setKaswareChecking(!hasKaswareProvider());
    setKastleChecking(!hasKastleProvider());

    void waitForKaswareProvider(4000)
      .then((detected) => {
        if (!cancelled) {
          setKaswareReady(detected);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setKaswareChecking(false);
        }
      });

    void waitForKastleProvider(4000)
      .then((detected) => {
        if (!cancelled) {
          setKastleReady(detected);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setKastleChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      void fetchRealtimeStats()
        .then((stats) => {
          if (!cancelled) {
            setRealtimeStats(stats);
            if (address) {
              const runtime = stats.agents.states.find(
                (candidate) => candidate.address.trim().toLowerCase() === address.trim().toLowerCase()
              );
              setAgentRuntime(runtime ?? null);
            }
          }
        })
        .catch((err: Error) => {
          if (!cancelled) {
            setError(err.message);
          }
        });
    };

    poll();
    const timer = window.setInterval(poll, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [address, setError]);

  const networkTag = networkInfo?.network || import.meta.env.VITE_DEFAULT_NETWORK || "testnet-10";
  const allowedPrefixes = useMemo(() => {
    const configuredPrefixes =
      networkInfo?.effectiveAddressPrefixes && networkInfo.effectiveAddressPrefixes.length > 0
        ? networkInfo.effectiveAddressPrefixes.map((value) => value.toLowerCase())
        : networkInfo?.allowedAddressPrefixes && networkInfo.allowedAddressPrefixes.length > 0
          ? networkInfo.allowedAddressPrefixes.map((value) => value.toLowerCase())
        : DEFAULT_ALLOWED_PREFIXES;
    const expectedPrefixes = expectedPrefixesForNetwork(networkTag);

    if (expectedPrefixes.length === 0) {
      return configuredPrefixes;
    }

    const strict = configuredPrefixes.filter((prefix) => expectedPrefixes.includes(prefix));
    return strict.length > 0 ? strict : expectedPrefixes;
  }, [networkInfo, networkTag]);
  const primaryPrefix = `${allowedPrefixes[0] || "kaspatest"}:`;
  const savedAddress = useMemo(() => {
    const stored = readSavedKaspiumAddress(networkTag);
    return stored && isAllowedKaspaAddress(stored, allowedPrefixes) ? stored : "";
  }, [allowedPrefixes, networkTag]);
  const selectedWalletSlot = WALLET_SLOT_BY_ID[walletSlot];
  const activeWalletLabel = connectedWalletSlot ? WALLET_SLOT_BY_ID[connectedWalletSlot].label : walletType;
  const kaspiumLaunchUri = useMemo(() => {
    const candidateAddress = manualAddress.trim() || savedAddress;
    if (candidateAddress) {
      return candidateAddress;
    }

    const scheme = (networkInfo?.wallets.kaspium.uriScheme || primaryPrefix.slice(0, -1)).replace(/:$/, "");
    return `${scheme}:`;
  }, [manualAddress, networkInfo?.wallets.kaspium.uriScheme, primaryPrefix, savedAddress]);

  useEffect(() => {
    if (!isAddressBackedSlot(walletSlot)) {
      return;
    }

    if (manualAddress.trim()) {
      return;
    }

    if (savedAddress) {
      setManualAddress(savedAddress);
    }
  }, [manualAddress, savedAddress, walletSlot]);

  useEffect(() => {
    if (status === "connected") {
      return;
    }

    setConnectedWalletSlot(null);
  }, [status]);

  useEffect(() => {
    if (!address || status !== "connected") {
      setAgentRuntime(null);
      return;
    }

    const preference = readAgentPreference(networkTag, address);
    setAgentMode(preference.mode);
    setAgentIntervalSeconds(preference.intervalSeconds);
    setAgentAutoResume(preference.autoResume);
  }, [address, networkTag, status]);

  useEffect(() => {
    if (!address || status !== "connected") {
      return;
    }

    saveAgentPreference(networkTag, address, {
      mode: agentMode,
      intervalSeconds: agentIntervalSeconds,
      autoResume: agentAutoResume
    });
  }, [address, agentAutoResume, agentIntervalSeconds, agentMode, networkTag, status]);

  useEffect(() => {
    if (!address || !sessionToken || status !== "connected") {
      setAgentRuntime(null);
      return;
    }

    let cancelled = false;
    const resumeKey = `${networkTag}:${address.toLowerCase()}`;
    const preference = readAgentPreference(networkTag, address);

    setAgentLoading(true);

    const loadState = async () => {
      const stateResult = await fetchAgentState(address, sessionToken);
      if (cancelled) {
        return;
      }

      setAgentRuntime(stateResult.state);
      const needsAutoResume =
        preference.autoResume &&
        !stateResult.state?.running &&
        !autoResumeAttemptedRef.current.has(resumeKey);

      if (!needsAutoResume) {
        return;
      }

      autoResumeAttemptedRef.current.add(resumeKey);
      const started = await startAgentRuntime({
        address,
        mode: preference.mode,
        intervalSeconds: preference.intervalSeconds,
        sessionToken
      });

      if (!cancelled) {
        setAgentRuntime(started.state);
      }
    };

    void loadState()
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAgentLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, networkTag, sessionToken, setError, status]);

  const feeConfigSummary = useMemo(() => {
    if (!networkInfo) {
      return "pricing unavailable";
    }

    const m = networkInfo.monetization;
    if (!m.platformFeeEnabled) {
      return "platform fee disabled";
    }

    return `${m.platformFeeBps} bps (min ${m.platformFeeMinKas} KAS)`;
  }, [networkInfo]);

  const connectKaswareSession = useCallback(
    async (options?: { preferredAddress?: string; requestPermission?: boolean }) => {
      const connected = await connectKasware({
        preferredAddress: options?.preferredAddress,
        requestPermission: options?.requestPermission
      });
      const connectedAddress = connected.address.trim();
      const targetAddress = options?.preferredAddress?.trim() || connectedAddress;

      if (
        options?.preferredAddress &&
        connectedAddress.toLowerCase() !== options.preferredAddress.trim().toLowerCase()
      ) {
        throw new Error("Kasware account switch is still pending. Confirm account switch in wallet and retry.");
      }

      if (!isAllowedKaspaAddress(targetAddress, allowedPrefixes)) {
        throw new Error(
          `Kasware returned ${targetAddress}. Allowed address prefixes for this environment: ${allowedPrefixes.join(", ")}`
        );
      }

      if (!areNetworksCompatible(connected.network, networkTag)) {
        throw new Error(
          `Kasware network (${connected.network || "unknown"}) does not match app network (${networkTag}). Switch wallet network and retry.`
        );
      }

      const challenge = await createWalletChallenge(targetAddress, "kasware");
      const signature = await signKaswareMessage(challenge.message);
      const session = await createWalletSession({
        nonce: challenge.nonce,
        signature,
        publicKey: connected.publicKey
      });

      setConnection({
        address: targetAddress,
        publicKey: connected.publicKey,
        sessionToken: session.token,
        verificationMode: session.verificationMode
      });
      setConnectedWalletSlot("kasware");

      const latestBalance = await fetchBalance(targetAddress);
      setBalance(latestBalance.balanceKas);
    },
    [allowedPrefixes, networkTag, setBalance, setConnection]
  );

  const connectKastleSession = useCallback(async () => {
    const connected = await connectKastle();
    const connectedAddress = connected.address.trim();

    if (!isAllowedKaspaAddress(connectedAddress, allowedPrefixes)) {
      throw new Error(
        `Kastle returned ${connectedAddress}. Allowed address prefixes for this environment: ${allowedPrefixes.join(", ")}`
      );
    }

    if (!areNetworksCompatible(connected.network, networkTag)) {
      throw new Error(
        `Kastle network (${connected.network || "unknown"}) does not match app network (${networkTag}). Switch wallet network and retry.`
      );
    }

    const challenge = await createWalletChallenge(connectedAddress, "kastle");
    const signature = await signKastleMessage(challenge.message);
    const session = await createWalletSession({
      nonce: challenge.nonce,
      signature,
      publicKey: connected.publicKey
    });

    setConnection({
      address: connectedAddress,
      publicKey: connected.publicKey,
      sessionToken: session.token,
      verificationMode: session.verificationMode
    });
    setConnectedWalletSlot("kastle");

    const latestBalance = await fetchBalance(connectedAddress);
    setBalance(latestBalance.balanceKas);
  }, [allowedPrefixes, networkTag, setBalance, setConnection]);

  const connectAddressBackedSession = useCallback(
    async (slotId: WalletSlotId) => {
      const targetAddress = (manualAddress.trim() || savedAddress).trim();
      const slotLabel = WALLET_SLOT_BY_ID[slotId].label;
      const sessionWalletType = walletTypeForSlot(slotId);

      if (!targetAddress) {
        throw new Error(
          `First-time ${slotLabel} setup needs one address for this network. Paste a ${primaryPrefix} address once; it will be remembered.`
        );
      }

      if (!isAllowedKaspaAddress(targetAddress, allowedPrefixes)) {
        throw new Error(`Enter a valid Kaspa address with prefix: ${allowedPrefixes.join(", ")}`);
      }

      setWalletType(sessionWalletType);
      setConnecting();
      const challenge = await createWalletChallenge(targetAddress, sessionWalletType);
      const session = await createWalletSession({ nonce: challenge.nonce });

      setConnection({
        address: targetAddress,
        sessionToken: session.token,
        verificationMode: session.verificationMode
      });
      setConnectedWalletSlot(slotId);
      saveKaspiumAddress(networkTag, targetAddress);
      setManualAddress(targetAddress);

      const latestBalance = await fetchBalance(targetAddress);
      setBalance(latestBalance.balanceKas);
    },
    [allowedPrefixes, manualAddress, networkTag, primaryPrefix, savedAddress, setBalance, setConnecting, setConnection, setWalletType]
  );

  async function handleKaswareConnect() {
    try {
      setWalletType("kasware");
      setWalletSlot("kasware");
      setConnecting();
      await connectKaswareSession({ requestPermission: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kasware connection failed");
    }
  }

  async function handleKastleConnect() {
    try {
      setWalletType("kastle");
      setWalletSlot("kastle");
      setConnecting();
      await connectKastleSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kastle connection failed");
    }
  }

  async function handleAddressSlotConnect(slotId: WalletSlotId) {
    try {
      setWalletSlot(slotId);
      await connectAddressBackedSession(slotId);
    } catch (err) {
      const label = WALLET_SLOT_BY_ID[slotId].label;
      setError(err instanceof Error ? err.message : `${label} connection failed`);
    }
  }

  useEffect(() => {
    if (walletType !== "kasware" || !kaswareReady || status !== "connected") {
      return;
    }

    const provider = getKaswareProvider();
    if (!provider) {
      return;
    }

    const unsubscribe = subscribeKaswareEvents({
      onAccountsChanged: (accounts) => {
        if (accounts.length === 0) {
          resetConnection();
          setConnectedWalletSlot(null);
          setError("Kasware disconnected this site or no account is selected. Reconnect to continue.");
          return;
        }

        const nextAddress = accounts[0]?.trim();
        if (!nextAddress) {
          return;
        }

        if (nextAddress.toLowerCase() === address.trim().toLowerCase()) {
          return;
        }

        setConnecting();
        void connectKaswareSession({ preferredAddress: nextAddress, requestPermission: false }).catch((err) => {
          resetConnection();
          setConnectedWalletSlot(null);
          setError(err instanceof Error ? err.message : "Kasware account switch handling failed");
        });
      },
      onNetworkChanged: (walletNetwork) => {
        if (!areNetworksCompatible(walletNetwork, networkTag)) {
          resetConnection();
          setConnectedWalletSlot(null);
          setError(
            `Kasware switched to ${walletNetwork}. This app is set to ${networkTag}. Switch back and reconnect.`
          );
          return;
        }

        if (address && !isAllowedKaspaAddress(address, allowedPrefixes)) {
          resetConnection();
          setConnectedWalletSlot(null);
          setError(
            `Connected address no longer matches ${networkTag} prefix rules (${allowedPrefixes.join(", ")}). Reconnect.`
          );
          return;
        }

        if (!address) {
          return;
        }

        void fetchBalance(address)
          .then((latestBalance) => setBalance(latestBalance.balanceKas))
          .catch((err: Error) => setError(err.message));
      }
    });

    return unsubscribe;
  }, [
    address,
    allowedPrefixes,
    connectKaswareSession,
    kaswareReady,
    networkTag,
    resetConnection,
    setConnectedWalletSlot,
    setBalance,
    setConnecting,
    setError,
    status,
    walletType
  ]);

  async function handleStartAgent() {
    try {
      if (!address || !sessionToken) {
        throw new Error("Connect a wallet first");
      }

      setAgentLoading(true);
      const result = await startAgentRuntime({
        address,
        mode: agentMode,
        intervalSeconds: agentIntervalSeconds,
        sessionToken
      });
      setAgentRuntime(result.state);
      saveAgentPreference(networkTag, address, {
        mode: agentMode,
        intervalSeconds: agentIntervalSeconds,
        autoResume: agentAutoResume
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start runtime");
    } finally {
      setAgentLoading(false);
    }
  }

  async function handleStopAgent() {
    try {
      if (!address || !sessionToken) {
        throw new Error("Connect a wallet first");
      }

      setAgentLoading(true);
      const result = await stopAgentRuntime({ address, sessionToken });
      setAgentRuntime(result.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop runtime");
    } finally {
      setAgentLoading(false);
    }
  }

  function handleDisconnect() {
    resetConnection();
    setConnectedWalletSlot(null);
  }

  async function refreshBalance() {
    try {
      if (!address) {
        throw new Error("Connect a wallet first");
      }

      const latestBalance = await fetchBalance(address);
      setBalance(latestBalance.balanceKas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Balance fetch failed");
    }
  }

  async function handleCreatePaymentQuote() {
    try {
      if (!address) {
        throw new Error("Connect a wallet before creating a payment intent");
      }
      if (!isAllowedKaspaAddress(paymentDestination, allowedPrefixes)) {
        throw new Error(`Enter a valid destination address with prefix: ${allowedPrefixes.join(", ")}`);
      }

      const quote = await createPaymentQuote({
        fromAddress: address,
        toAddress: paymentDestination,
        amountKas: paymentAmount,
        walletType,
        note: paymentNote
      });

      setPaymentQuote(quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment quote failed");
    }
  }

  useEffect(() => {
    if (!address || status !== "connected") {
      return;
    }

    let cancelled = false;
    const poll = () => {
      void fetchBalance(address)
        .then((latestBalance) => {
          if (!cancelled) {
            setBalance(latestBalance.balanceKas);
          }
        })
        .catch((err: Error) => {
          if (!cancelled) {
            setError(err.message);
          }
        });
    };

    const timer = window.setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [address, setBalance, setError, status]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6 text-slate-100">
      <header className="mb-6 rounded-2xl border border-teal-300/30 bg-kaspa-panel/80 p-5 shadow-xl">
        <h1 className="text-2xl font-semibold text-kaspa-mint">Kaspa Wallet Fullstack Control Room</h1>
        <p className="mt-2 text-sm text-slate-300">
          Testnet-focused stack with Kasware/Kastle injected wallets + Kaspium mobile/deeplink mode.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-slate-800 px-2 py-1">network: {networkTag}</span>
          <span className="rounded bg-slate-800 px-2 py-1">api: {networkInfo?.rpcTarget ?? "unavailable"}</span>
          <span className="rounded bg-slate-800 px-2 py-1">status: {status}</span>
          <span className="rounded bg-slate-800 px-2 py-1">
            node synced: {realtimeStats?.node ? (realtimeStats.node.isSynced ? "yes" : "no") : "unknown"}
          </span>
          <span className="rounded bg-slate-800 px-2 py-1">
            virtual DAA: {realtimeStats?.node?.virtualDaaScore ?? "n/a"}
          </span>
          <span className="rounded bg-slate-800 px-2 py-1">
            active agents: {realtimeStats?.agents.running ?? 0}/{realtimeStats?.agents.tracked ?? 0}
          </span>
          <span className="rounded bg-slate-800 px-2 py-1">
            runtime store: {networkInfo?.runtime?.store ?? "memory"}
          </span>
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
          <h2 className="text-lg font-medium">Wallet Connection</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {WALLET_SLOTS.map((slot) => {
              const selected = walletSlot === slot.id;
              const readiness =
                slot.id === "kasware"
                  ? kaswareChecking
                    ? "checking extension"
                    : kaswareReady
                      ? "ready"
                      : "install extension"
                  : slot.id === "kastle"
                    ? kastleChecking
                      ? "checking extension"
                      : kastleReady
                        ? "ready"
                        : "install extension"
                    : slot.id === "kaspium"
                      ? savedAddress
                        ? "saved address ready"
                        : "first address setup"
                      : "address-backed session";

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setWalletSlot(slot.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-kaspa-mint bg-kaspa-mint/10"
                      : "border-slate-700 bg-slate-900/50 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-100">{slot.label}</span>
                    <span className="rounded bg-slate-800 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300">
                      {readiness}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{slot.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
            {selectedWalletSlot.connectMode === "injected" ? (
              walletSlot === "kasware" ? (
                <>
                  <p className="text-sm text-slate-300">
                    Extension detected: {kaswareChecking ? "checking..." : kaswareReady ? "yes" : "no"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleKaswareConnect}
                      disabled={!kaswareReady}
                      className="rounded bg-kaspa-mint px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Connect Kasware
                    </button>
                    {!kaswareReady && selectedWalletSlot.installUrl ? (
                      <a
                        href={selectedWalletSlot.installUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-slate-500 px-4 py-2 text-sm"
                      >
                        Install Kasware
                      </a>
                    ) : null}
                    {selectedWalletSlot.docsUrl ? (
                      <a
                        href={selectedWalletSlot.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-slate-500 px-4 py-2 text-sm"
                      >
                        Docs
                      </a>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-300">
                    Extension detected: {kastleChecking ? "checking..." : kastleReady ? "yes" : "no"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleKastleConnect}
                      disabled={!kastleReady}
                      className="rounded bg-kaspa-mint px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Connect Kastle
                    </button>
                    {!kastleReady && selectedWalletSlot.installUrl ? (
                      <a
                        href={selectedWalletSlot.installUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-slate-500 px-4 py-2 text-sm"
                      >
                        Install Kastle
                      </a>
                    ) : null}
                    {selectedWalletSlot.docsUrl ? (
                      <a
                        href={selectedWalletSlot.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-slate-500 px-4 py-2 text-sm"
                      >
                        Docs
                      </a>
                    ) : null}
                  </div>
                </>
              )
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {selectedWalletSlot.installUrl ? (
                    <a
                      href={selectedWalletSlot.installUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-slate-500 px-4 py-2 text-sm"
                    >
                      Open {selectedWalletSlot.label}
                    </a>
                  ) : null}
                  {selectedWalletSlot.docsUrl ? (
                    <a
                      href={selectedWalletSlot.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-slate-500 px-4 py-2 text-sm"
                    >
                      Wallet docs
                    </a>
                  ) : null}
                  {walletSlot === "kaspium" ? (
                    <a href={kaspiumLaunchUri} className="rounded border border-slate-500 px-4 py-2 text-sm">
                      Launch Kaspium deeplink
                    </a>
                  ) : null}
                  {savedAddress ? (
                    <button
                      type="button"
                      onClick={() => setManualAddress(savedAddress)}
                      className="rounded border border-slate-500 px-4 py-2 text-sm"
                    >
                      Use saved address
                    </button>
                  ) : null}
                </div>
                <label className="block text-sm text-slate-300">
                  {selectedWalletSlot.label} address
                  <input
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder={`${primaryPrefix}...`}
                    className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                  />
                </label>
                <p className="text-xs text-slate-400">
                  Saved address for {networkTag}: {savedAddress || "none yet"}.
                </p>
                <button
                  type="button"
                  onClick={() => handleAddressSlotConnect(walletSlot)}
                  className="rounded bg-kaspa-mint px-4 py-2 text-sm font-medium text-black"
                >
                  Connect {selectedWalletSlot.label}
                </button>
              </>
            )}
          </div>

          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </article>

        <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
          <h2 className="text-lg font-medium">Wallet State</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-slate-400">address</dt>
              <dd className="break-all">{address || "not connected"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">public key</dt>
              <dd className="break-all">{publicKey || "n/a"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">session</dt>
              <dd className="break-all">{sessionToken ? `${sessionToken.slice(0, 20)}...` : "none"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">connected via</dt>
              <dd>{activeWalletLabel || "n/a"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">verification</dt>
              <dd>{verificationMode || "n/a"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">balance</dt>
              <dd>{balanceKas ? `${balanceKas} KAS` : "unknown"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">agent runtime</dt>
              <dd>{agentRuntime?.running ? "running" : "stopped"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">agent cycles</dt>
              <dd>{agentRuntime?.cycles ?? 0}</dd>
            </div>
            <div>
              <dt className="text-slate-400">last agent tick</dt>
              <dd>{agentRuntime?.lastTickAt || "n/a"}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshBalance}
              className="rounded bg-slate-700 px-4 py-2 text-sm"
            >
              Refresh balance
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="rounded border border-slate-600 px-4 py-2 text-sm"
            >
              Sign out (runtime keeps running)
            </button>
          </div>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <h2 className="text-lg font-medium">Agent Runtime Control</h2>
        <p className="mt-2 text-sm text-slate-300">
          Wallet-scoped runtime executes server-side against live Kaspa node data. Reconnecting the same wallet restores
          state and auto-resume preferences.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-300">
            mode
            <select
              value={agentMode}
              onChange={(event) => setAgentMode(event.target.value === "accumulate" ? "accumulate" : "observe")}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="observe">observe</option>
              <option value="accumulate">accumulate</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            interval (seconds)
            <input
              type="number"
              min={5}
              max={300}
              value={agentIntervalSeconds}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value || "15", 10);
                setAgentIntervalSeconds(Number.isFinite(parsed) ? Math.max(5, Math.min(300, parsed)) : 15);
              }}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 self-end text-sm text-slate-300">
            <input
              type="checkbox"
              checked={agentAutoResume}
              onChange={(event) => setAgentAutoResume(event.target.checked)}
              className="h-4 w-4"
            />
            auto-resume when same wallet reconnects
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleStartAgent}
            disabled={!address || !sessionToken || agentLoading}
            className="rounded bg-kaspa-mint px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {agentLoading ? "Working..." : "Start runtime"}
          </button>
          <button
            type="button"
            onClick={handleStopAgent}
            disabled={!address || !sessionToken || agentLoading}
            className="rounded border border-slate-500 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            Stop runtime
          </button>
        </div>
        <div className="mt-3 rounded bg-slate-800 p-3 text-xs text-slate-300">
          runtime state: {agentRuntime?.running ? "running" : "stopped"} | cycles: {agentRuntime?.cycles ?? 0} | last
          tick: {agentRuntime?.lastTickAt ?? "n/a"} | node synced:{" "}
          {agentRuntime?.nodeSynced === undefined ? "n/a" : agentRuntime.nodeSynced ? "yes" : "no"}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <h2 className="text-lg font-medium">Payment Intent + Fee Breakdown</h2>
        <p className="mt-2 text-sm text-slate-300">
          Transparent monetization mode. The platform fee configuration is published by backend network metadata.
        </p>
        <div className="mt-2 rounded bg-slate-800 p-2 text-xs text-slate-300">current pricing: {feeConfigSummary}</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-300">
            destination address
            <input
              value={paymentDestination}
              onChange={(e) => setPaymentDestination(e.target.value)}
              placeholder={`${primaryPrefix}...`}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-300">
            amount (KAS)
            <input
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-slate-300 md:col-span-2">
            note (optional)
            <input
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleCreatePaymentQuote}
          className="mt-4 rounded bg-kaspa-mint px-4 py-2 text-sm font-medium text-black"
        >
          Create payment quote
        </button>

        {paymentQuote ? (
          <div className="mt-4 rounded border border-slate-700 bg-slate-800/70 p-4 text-sm">
            <p className="text-slate-300">{paymentQuote.pricing.disclosure}</p>
            <dl className="mt-3 grid gap-2 md:grid-cols-2">
              <div>
                <dt className="text-slate-400">recipient amount</dt>
                <dd>{paymentQuote.pricing.platformFee.amountKas} KAS</dd>
              </div>
              <div>
                <dt className="text-slate-400">platform fee</dt>
                <dd>{paymentQuote.pricing.platformFee.feeKas} KAS</dd>
              </div>
              <div>
                <dt className="text-slate-400">total debit</dt>
                <dd>{paymentQuote.pricing.platformFee.totalDebitKas} KAS</dd>
              </div>
              <div>
                <dt className="text-slate-400">platform wallet</dt>
                <dd className="break-all">{paymentQuote.pricing.platformFee.recipientAddress}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={paymentQuote.paymentIntents.primary.uri}
                className="rounded bg-kaspa-mint px-3 py-2 text-xs font-semibold text-black"
              >
                Open recipient payment URI
              </a>
              {paymentQuote.paymentIntents.platformFee ? (
                <a
                  href={paymentQuote.paymentIntents.platformFee.uri}
                  className="rounded bg-slate-700 px-3 py-2 text-xs"
                >
                  Open platform fee URI
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded bg-slate-800 p-2 text-xs text-slate-300">
            Generate a quote to preview destination amount, platform fee, and deeplink intents.
          </p>
        )}
      </section>
    </main>
  );
}
