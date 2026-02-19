import { useEffect, useMemo, useState } from "react";
import {
  createWalletChallenge,
  createWalletSession,
  fetchBalance,
  fetchNetwork,
  type NetworkResponse
} from "./lib/api";
import {
  buildKaspaUri,
  connectKasware,
  hasKaswareProvider,
  signKaswareMessage,
  type WalletType
} from "./lib/walletAdapters";
import { useWalletStore } from "./state/walletStore";

const TESTNET_PREFIX = "kaspatest:";

function isLikelyKaspaAddress(value: string): boolean {
  return /^(kaspa|kaspatest|kaspasim|kaspadev):[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/i.test(value);
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
    setBalance,
    setError
  } = useWalletStore();

  const [networkInfo, setNetworkInfo] = useState<NetworkResponse | null>(null);
  const [manualAddress, setManualAddress] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("1.0");

  useEffect(() => {
    fetchNetwork().then(setNetworkInfo).catch((err: Error) => setError(err.message));
  }, [setError]);

  const kaspiumUri = useMemo(() => {
    if (!address) {
      return "";
    }
    return buildKaspaUri(address, paymentAmount || undefined, "Kaspium Testnet Payment");
  }, [address, paymentAmount]);

  async function handleKaswareConnect() {
    try {
      setConnecting();
      const connected = await connectKasware();

      const challenge = await createWalletChallenge(connected.address, "kasware");
      const signature = await signKaswareMessage(challenge.message);
      const session = await createWalletSession({
        nonce: challenge.nonce,
        signature,
        publicKey: connected.publicKey
      });

      setConnection({
        address: connected.address,
        publicKey: connected.publicKey,
        sessionToken: session.token,
        verificationMode: session.verificationMode
      });

      const latestBalance = await fetchBalance(connected.address);
      setBalance(latestBalance.balanceKas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kasware connection failed");
    }
  }

  async function handleKaspiumConnect() {
    try {
      if (!isLikelyKaspaAddress(manualAddress)) {
        throw new Error("Enter a valid Kaspa address (kaspatest:...)");
      }

      setConnecting();
      const challenge = await createWalletChallenge(manualAddress, "kaspium");
      const session = await createWalletSession({ nonce: challenge.nonce });

      setConnection({
        address: manualAddress,
        sessionToken: session.token,
        verificationMode: session.verificationMode
      });

      const latestBalance = await fetchBalance(manualAddress);
      setBalance(latestBalance.balanceKas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaspium connection failed");
    }
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

  const networkTag = networkInfo?.network || import.meta.env.VITE_DEFAULT_NETWORK || "testnet-10";

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6 text-slate-100">
      <header className="mb-6 rounded-2xl border border-teal-300/30 bg-kaspa-panel/80 p-5 shadow-xl">
        <h1 className="text-2xl font-semibold text-kaspa-mint">Kaspa Wallet Fullstack Control Room</h1>
        <p className="mt-2 text-sm text-slate-300">
          Testnet-focused stack with Kasware injected wallet + Kaspium mobile/deeplink mode.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-slate-800 px-2 py-1">network: {networkTag}</span>
          <span className="rounded bg-slate-800 px-2 py-1">api: {networkInfo?.rpcTarget ?? "unavailable"}</span>
          <span className="rounded bg-slate-800 px-2 py-1">status: {status}</span>
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
          <h2 className="text-lg font-medium">Wallet Connection</h2>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setWalletType("kasware")}
              className={`rounded px-3 py-2 text-sm ${walletType === "kasware" ? "bg-kaspa-mint text-black" : "bg-slate-800"}`}
            >
              Kasware
            </button>
            <button
              type="button"
              onClick={() => setWalletType("kaspium")}
              className={`rounded px-3 py-2 text-sm ${walletType === "kaspium" ? "bg-kaspa-mint text-black" : "bg-slate-800"}`}
            >
              Kaspium
            </button>
          </div>

          {walletType === "kasware" ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-300">
                Extension detected: {hasKaswareProvider() ? "yes" : "no"}
              </p>
              <button
                type="button"
                onClick={handleKaswareConnect}
                className="rounded bg-kaspa-mint px-4 py-2 text-sm font-medium text-black"
              >
                Connect Kasware
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block text-sm text-slate-300">
                Kaspium address
                <input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder={`${TESTNET_PREFIX}...`}
                  className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={handleKaspiumConnect}
                className="rounded bg-kaspa-mint px-4 py-2 text-sm font-medium text-black"
              >
                Connect Kaspium (manual)
              </button>
            </div>
          )}

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
              <dt className="text-slate-400">verification</dt>
              <dd>{verificationMode || "n/a"}</dd>
            </div>
            <div>
              <dt className="text-slate-400">balance</dt>
              <dd>{balanceKas ? `${balanceKas} KAS` : "unknown"}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={refreshBalance}
            className="mt-4 rounded bg-slate-700 px-4 py-2 text-sm"
          >
            Refresh balance
          </button>
        </article>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
        <h2 className="text-lg font-medium">Kaspium Deeplink</h2>
        <p className="mt-2 text-sm text-slate-300">
          Use this URI for mobile handoff. Works best when your connected address is a testnet account.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            amount (KAS)
            <input
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="ml-2 rounded border border-slate-600 bg-slate-800 px-2 py-1"
            />
          </label>
          {kaspiumUri ? (
            <a href={kaspiumUri} className="rounded bg-kaspa-mint px-3 py-2 text-sm font-medium text-black">
              Open in wallet
            </a>
          ) : null}
        </div>
        <p className="mt-3 break-all rounded bg-slate-800 p-2 text-xs text-slate-300">{kaspiumUri || "connect wallet to generate"}</p>
      </section>
    </main>
  );
}
