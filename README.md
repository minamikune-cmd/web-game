# GREEN FELT · Mini Billiards

A lightweight, dependency-free 2D billiards game built with HTML Canvas. The entire game runs in the browser; no API, database, build step, or environment variables are required.

## Play

Open `index.html` in a browser, or deploy the repository as a static site.

- Drag from the cue ball and release to aim and shoot.
- Drag distance controls shot power.
- Pocket all 10 object balls to clear the table.
- Reset the rack at any time; optional sound effects are available.

## Deploy to Vercel

Import `minamikune-cmd/web-game` as a new Vercel project. Use the repository root as the project root and leave the framework preset as **Other**. No build command is needed; the output is the repository root.

## Deploy to Cloudflare Pages

Create a Pages project connected to this Git repository. Set the production branch to `main`, leave the build command empty, and set the build output directory to `/` (repository root). The included `wrangler.toml` also supports Wrangler Pages workflows.

For a local preview, run:

```sh
npx wrangler pages dev .
```

## Stack

- HTML, CSS, Canvas 2D, vanilla JavaScript
- No dependencies, frameworks, backend, or secrets
- Responsive layout and pointer input for mouse and touch
