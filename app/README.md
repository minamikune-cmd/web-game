# Billiards Web App

The production application lives in this directory. The original repository-root game is retained as a Demo / Reference and is not modified by this scaffold.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run preview
```

## Deployment

### Vercel

Import this repository and set **Root Directory** to `app`. Vercel should detect Vite automatically. Build command: `npm run build`; output directory: `dist`.

### Cloudflare Pages

Set the project root to `app`, build command to `npm run build`, and build output directory to `dist`. The included `wrangler.toml` is configured for Pages.
