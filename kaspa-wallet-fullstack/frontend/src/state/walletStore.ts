import { create } from "zustand";
import type { WalletType } from "../lib/walletAdapters";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

type WalletState = {
  walletType: WalletType;
  address: string;
  publicKey?: string;
  sessionToken?: string;
  verificationMode?: string;
  balanceKas?: string;
  status: ConnectionState;
  error?: string;
  setWalletType: (walletType: WalletType) => void;
  setConnecting: () => void;
  setConnection: (payload: {
    address: string;
    publicKey?: string;
    sessionToken?: string;
    verificationMode?: string;
  }) => void;
  setBalance: (balanceKas: string) => void;
  setError: (error: string) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  walletType: "kasware",
  address: "",
  status: "idle",
  setWalletType: (walletType) => set({ walletType, error: undefined }),
  setConnecting: () => set({ status: "connecting", error: undefined }),
  setConnection: ({ address, publicKey, sessionToken, verificationMode }) =>
    set({
      address,
      publicKey,
      sessionToken,
      verificationMode,
      status: "connected",
      error: undefined
    }),
  setBalance: (balanceKas) => set({ balanceKas }),
  setError: (error) => set({ error, status: "error" })
}));
