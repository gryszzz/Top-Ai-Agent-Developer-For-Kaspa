import type { WalletType } from "./walletAdapters";

export type WalletSlotId =
  | "kasware"
  | "kastle"
  | "kaspium"
  | "kng-web"
  | "kng-mobile"
  | "ledger-kasvault"
  | "cli-wallet";

export function walletTypeForSlot(slotId: WalletSlotId): WalletType {
  switch (slotId) {
    case "kasware":
      return "kasware";
    case "kastle":
      return "kastle";
    case "kng-web":
      return "kng_web";
    case "kng-mobile":
      return "kng_mobile";
    case "ledger-kasvault":
      return "ledger_kasvault";
    case "cli-wallet":
      return "cli_wallet";
    case "kaspium":
    default:
      return "kaspium";
  }
}
