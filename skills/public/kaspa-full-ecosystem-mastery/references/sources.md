# Source Inventory

## Canonical Documentation

- Kaspa Official: `https://kaspa.org/`
- Docs: `https://docs.kas.fyi/`
- Wiki: `https://wiki.kaspa.org/`

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
