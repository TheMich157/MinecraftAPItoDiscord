This repository has been lightly consolidated for easier development and startup.

What changed:

- Added unified npm scripts in `package.json`:
  - `npm run dev:all` — runs API, dashboard dev, and bot dev concurrently.
  - `npm run start:all` — runs API, bot, and render server concurrently (for serving built dashboard).
  - `npm run start:web` — builds the dashboard and starts the render server.

- Added `env.template` at repository root with consolidated environment variables for API, bot, dashboard, RCON, and Minecraft API.

Notes about merging bot + dashboard:

- The dashboard and bot code remain in their respective folders (`dashboard/` and `bot/`) to avoid breaking existing references and configs.
- `start:all` and `dev:all` provide a simple single-command experience to run both services together.

Minecraft related code:

- The existing `minecraft-server/` and `minecraft-server-plugin/` folders were left in place to preserve history and builds. Consider moving them under a single `minecraft/` folder if you want physical consolidation; this requires updating any CI/deploy scripts.
The existing `minecraft-server/` and `minecraft-server-plugin/` folders were left in place to preserve history and builds. A new `minecraft/` helper README was added at `minecraft/README.md`.
I also added proxy dashboard scripts to `bot/package.json` so you can run dashboard commands from the `bot` package:

- Run dashboard in dev from the bot folder: `npm --prefix bot run dashboard:dev` or `cd bot && npm run dashboard:dev`
- Build dashboard from the bot folder: `npm --prefix bot run dashboard:build` or `cd bot && npm run dashboard:build`

If you want the files physically moved under `minecraft/` or want the dashboard fully relocated into `bot/`, I can perform the move and update references.

Next steps (optional):

- If you want me to physically move the `minecraft-server` and `minecraft-server-plugin` folders under `minecraft/`, I can perform the move and update references.
- I can also add a lightweight static server (if `render-server.js` is not adequate) or make `start:all` build the dashboard automatically before serving.
