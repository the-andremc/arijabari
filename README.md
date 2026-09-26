# arijabari.com

Static site for arijabari.com, hosted on Cloudflare Pages.

- Site files live in `public/` (that folder is what gets deployed).
- `npm install` then `npm run dev` for a local preview.
- `npm run deploy` deploys manually with Wrangler. Pushes to `main` deploy automatically once the Pages project is connected to this repo.

## Cloudflare Pages settings

| Setting | Value |
| --- | --- |
| Project name | `arijabari` |
| Production branch | `main` |
| Build command | *(none)* |
| Build output directory | `public` |
