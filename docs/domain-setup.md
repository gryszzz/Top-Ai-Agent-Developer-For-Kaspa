# Custom Domain Setup (GitHub Pages)

Canonical domain for this repository:

- https://forge-os.xyz

Fallback project URL:

- https://gryszzz.github.io/Top-Ai-Agent-Developer-For-Kaspa/

## DNS records (Name.com or similar)

Set these records:

1. Apex `A` records for `forge-os.xyz`:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
2. `CNAME` for `www`:
   - `www -> gryszzz.github.io`
3. Remove conflicting `www` `A`/`AAAA`/URL redirect records.

## GitHub Pages settings

1. Repo -> `Settings` -> `Pages`.
2. Set `Custom domain` to `forge-os.xyz` and save.
3. Wait for certificate provisioning.
4. Enable `Enforce HTTPS`.

## Repo behavior

- `docs/CNAME` is committed as `forge-os.xyz`.
- Pages workflow always writes a `CNAME` into the deploy artifact.
- Optional Actions variable `GH_PAGES_CNAME` can override if needed.

## Quick verification commands

```bash
dig +short forge-os.xyz A
dig +short www.forge-os.xyz CNAME
curl -I https://forge-os.xyz
curl -I https://www.forge-os.xyz
```
