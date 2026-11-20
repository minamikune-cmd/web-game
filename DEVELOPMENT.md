# Development Environment

## Repository layout

- Repository root: existing GREEN FELT mini-billiards demo/reference. Kept intact.
- `app/`: new production application scaffold (Vite + TypeScript, no UI framework).
- `app/src/`: application source.
- `app/dist/`: generated production build (not committed).

## Local setup

```bash
cd app
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

## Deployment roots

- Vercel: set Root Directory to `app`, build command to `npm run build`, output directory to `dist`.
- Cloudflare Pages: set the project root to `app`, build command to `npm run build`, output directory to `dist`.

No database, API service, credentials, or runtime environment variables are required at this stage.
