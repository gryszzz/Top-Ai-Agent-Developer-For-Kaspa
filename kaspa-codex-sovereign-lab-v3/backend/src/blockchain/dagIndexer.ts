export type Utxo = {
  txHash: string;
  amount: number;
};

export type DagBlock = {
  hash: string;
  txHashes: string[];
  descendantCount: number;
};

const utxoStore = new Map<string, Utxo[]>();
const blockDAG: DagBlock[] = [];

export async function getUTXOs(wallet: string): Promise<Utxo[]> {
  return utxoStore.get(wallet) ?? [];
}

export async function getBlockDAG(): Promise<DagBlock[]> {
  return blockDAG;
}

export async function processNewBlock(block: DagBlock, outputs: Array<{ wallet: string; txHash: string; amount: number }>): Promise<void> {
  blockDAG.push(block);
  for (const output of outputs) {
    const current = utxoStore.get(output.wallet) ?? [];
    current.push({ txHash: output.txHash, amount: output.amount });
    utxoStore.set(output.wallet, current);
  }
}

// Seed with predictable demo data so frontend can render without live nodes.
void processNewBlock(
  { hash: "block-1", txHashes: ["tx-a", "tx-b"], descendantCount: 8 },
  [
    { wallet: "kaspatest:qexamplewallet", txHash: "tx-a", amount: 1.25 },
    { wallet: "kaspatest:qexamplewallet", txHash: "tx-b", amount: 0.5 }
  ]
);
