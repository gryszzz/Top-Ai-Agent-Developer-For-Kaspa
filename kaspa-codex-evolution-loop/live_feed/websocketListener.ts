import { EventEmitter } from "node:events";
import { LiveBlock } from "./rpcClient";

export class LiveFeedSocket extends EventEmitter {
  pushBlock(block: LiveBlock): void {
    this.emit("block", block);
  }
}
