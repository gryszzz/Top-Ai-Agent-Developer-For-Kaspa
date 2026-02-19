import { Router } from "express";
import { getBlockDAG, getUTXOs } from "../blockchain/dagIndexer";

const router = Router();

router.get("/:wallet", async (req, res) => {
  const wallet = req.params.wallet;
  const utxos = await getUTXOs(wallet);
  const dag = await getBlockDAG();
  const confidence: Record<string, number> = {};

  for (const utxo of utxos) {
    const block = dag.find((b) => b.txHashes.includes(utxo.txHash));
    confidence[utxo.txHash] = Math.min(1, ((block?.descendantCount ?? 0) / 10));
  }

  res.json(confidence);
});

export default router;
