Branding preview pages
- `/tools/branding/assets.html`
- `/tools/branding/social.html`

Export favicon
```bash
node tools/branding/export.mjs --favicon http://localhost:5173/tools/branding/assets.html public/favicon.png
```
Export social preview
```bash
node tools/branding/export.mjs --social http://localhost:5173/tools/branding/social.html docs/img/social.png
```
