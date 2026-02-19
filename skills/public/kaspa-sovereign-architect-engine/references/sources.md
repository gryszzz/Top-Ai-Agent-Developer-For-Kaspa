# Source Inventory

## Canonical Documentation

- Kaspa Official: `https://kaspa.org/`
- Docs: `https://docs.kas.fyi/`
- Wiki: `https://wiki.kaspa.org/`
- GhostDAG / PHANTOM paper: `https://eprint.iacr.org/2018/104.pdf`
- Kaspa Explorer: `https://explorer.kaspa.org/`
- Alternative Explorer: `https://kas.fyi/`

## Canonical Repositories

- Rusty Kaspa: `https://github.com/kaspanet/rusty-kaspa`
- Kaspa NG (kaspad): `https://github.com/kaspanet/kaspad`
- kaspa-js: `https://github.com/kaspanet/kaspa-js`
- WASM SDK (inside Rusty Kaspa): `https://github.com/kaspanet/rusty-kaspa/tree/master/wasm`
- KDApp Tutorial (inside Rusty Kaspa): `https://github.com/kaspanet/rusty-kaspa/tree/master/tutorials`
- SilverScript: `https://github.com/kaspanet/silverscript`
- Kasia: `https://github.com/K-Kluster/Kasia`
- Kaspium Wallet: `https://github.com/azbuky/kaspium_wallet`
- Kasware Wallet Extension: `https://github.com/kasware-wallet/extension`

## Protocol and Consensus Comparators

- Bitcoin Core index modules: `https://github.com/bitcoin/bitcoin/tree/master/src/index`
- Bitcoin BIPs: `https://github.com/bitcoin/bips`
- Ethereum EIP-1193: `https://eips.ethereum.org/EIPS/eip-1193`

## Indexing and Query-Layer References

- The Graph docs: `https://thegraph.com/docs/`
- PostgreSQL docs: `https://www.postgresql.org/docs/`
- ClickHouse docs: `https://clickhouse.com/docs/`

## Cryptography and Wallet Foundations

- CryptoBook: `https://cryptobook.nakov.com/`
- Mastering Bitcoin repository: `https://github.com/bitcoinbook/bitcoinbook`

## DevOps and Platform References

- Docker docs: `https://docs.docker.com/`
- Kubernetes docs: `https://kubernetes.io/docs/home/`
- NGINX docs: `https://nginx.org/en/docs/`
- Redis docs: `https://redis.io/docs/`
- Cloudflare developer docs: `https://developers.cloudflare.com/`

## UX and Product References

- Refactoring UI: `https://www.refactoringui.com/`
- Nielsen Norman Group: `https://www.nngroup.com/articles/`
- Laws of UX: `https://lawsofux.com/`

## Suggested Local Workspace Layout

```text
repos/
  rusty-kaspa/
  kaspad/
  kaspa-js/
  silverscript/
  kasia/
  kaspium_wallet/
  kasware-extension/
```

## Snapshot Discipline

Record commit and analysis date for each repo before reporting:

```bash
git -C repos/<repo-name> rev-parse HEAD
git -C repos/<repo-name> show -s --format=%ci HEAD
```

Record branch state when the working tree is not detached:

```bash
git -C repos/<repo-name> rev-parse --abbrev-ref HEAD
git -C repos/<repo-name> status --short
```

For web sources that are not git repositories, record fetch date and URL explicitly in the report.
