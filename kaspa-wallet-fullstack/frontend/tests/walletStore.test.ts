import { beforeEach, describe, expect, it } from "vitest";
import { useWalletStore } from "../src/state/walletStore";

const baselineState = useWalletStore.getState();

function resetStore() {
  useWalletStore.setState(
    {
      ...baselineState,
      walletType: "kasware",
      address: "",
      publicKey: undefined,
      sessionToken: undefined,
      verificationMode: undefined,
      balanceKas: undefined,
      status: "idle",
      error: undefined
    },
    true
  );
}

describe("wallet store error transitions", () => {
  beforeEach(() => {
    resetStore();
  });

  it("keeps connected session status on non-fatal errors", () => {
    const store = useWalletStore.getState();
    store.setConnection({
      address: "kaspatest:qpv7fcvdlz6th4hqjtm9qkkms2dw0raem963x3hm8glu3kjgj7922vy69hv85",
      sessionToken: "session-token"
    });
    store.setError("stats stream degraded");

    const next = useWalletStore.getState();
    expect(next.status).toBe("connected");
    expect(next.error).toBe("stats stream degraded");
    expect(next.sessionToken).toBe("session-token");
  });

  it("marks status as error when failure occurs before connection", () => {
    const store = useWalletStore.getState();
    store.setConnecting();
    store.setError("connection failed");

    const next = useWalletStore.getState();
    expect(next.status).toBe("error");
    expect(next.error).toBe("connection failed");
  });
});
