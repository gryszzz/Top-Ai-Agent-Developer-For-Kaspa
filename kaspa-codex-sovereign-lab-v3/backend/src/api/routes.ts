import { Router } from "express";
import { getUTXOs } from "../blockchain/dagIndexer";
import confirmationRouter from "./confirmation";

const router = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.get("/utxos/:wallet", async (req, res) => {
  const wallet = req.params.wallet;
  const utxos = await getUTXOs(wallet);
  res.json(utxos);
});

router.use("/confirmation-confidence", confirmationRouter);

export default router;
