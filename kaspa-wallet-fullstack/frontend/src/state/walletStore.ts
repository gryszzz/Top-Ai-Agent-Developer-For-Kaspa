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
  resetConnection: () => void;
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
  resetConnection: () =>
    set({
      address: "",
      publicKey: undefined,
      sessionToken: undefined,
      verificationMode: undefined,
      balanceKas: undefined,
      status: "idle",
      error: undefined
    }),
  setBalance: (balanceKas) => set({ balanceKas }),
  setError: (error) =>
    set((state) => ({
      error,
      status: state.status === "connected" ? "connected" : "error"
    }))
}));
