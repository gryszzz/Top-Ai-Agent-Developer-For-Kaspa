# Custom Domain Setup (GitHub Pages)

This project is already live at:

- https://gryszzz.github.io/Top-Ai-Agent-Developer-For-Kaspa/

To attach your own domain:

1. In GitHub repo settings, add Actions variable:
   - `GH_PAGES_CNAME=skill.yourdomain.com`
2. Configure DNS at your registrar:
   - `CNAME skill -> gryszzz.github.io`
3. Push any commit (or run Pages workflow manually).
4. Verify the deployed site resolves on your custom domain.

Notes:
- The Pages workflow auto-generates `CNAME` from `GH_PAGES_CNAME`.
- HTTPS certificate issuance is handled by GitHub Pages after DNS propagates.
