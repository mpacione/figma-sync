# figma-sync

Local-first **Code⇄Figma sync tool** for a Next.js + React + Tailwind app and a local Figma plugin.

Core ideas:

- Parse your app into a **CodeModel** (components, screens, design tokens).
- Generate a **DesignSpec** + **FigmaInstructionSet** to bootstrap a minimal Figma file.
- Let Figma changes (renames, token edits) flow back into code via structured patches.

---

## Monorepo layout

This repo is a small TypeScript monorepo managed with npm workspaces:

- `packages/core` – `figma-sync-core` library
  - Data models (`CodeModel`, `DesignSpec`, `FigmaInstructionSet`, `FigmaChangeSet`, `CodePatchSet`).
  - Pure transforms (analysis, spec building, patch building, patch application).
- `packages/cli` – `figma-sync-cli` binary
  - CLI commands: `scan`, `generate-spec`, `serve`, `generate-patches`, `apply-patches`, `validate`.
  - Node environment wiring and HTTP server.
- `packages/plugin` – `figma-sync-plugin` Figma plugin
  - Manifest + `main.ts` entrypoint.
  - Executes instructions and exports changes.
- `docs/` – specs and guides
  - `docs/figma-sync-spec.md` – v0.1 spec (source of truth for behavior).
  - `docs/getting-started.md` – end‑to‑end usage against a Next.js app + Figma.
  - `docs/outstanding-work-v0.1.md` – tracked remaining work for v0.1.
  - `docs/maintainers-guide.md` – architecture, flows, and extension guidance for contributors.

---

## Requirements

- Node.js **20+** (tested with modern Node compatible with TypeScript ES2020 output).
- npm (comes with Node).

All packages are TypeScript and use Vitest for tests.

---

## Monorepo developer quickstart

From the repo root:

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Build all packages** (core, CLI, plugin)

   ```bash
   npm run build
   ```

3. **Run the CLI locally (preferred entrypoint)**

   The CLI is compiled into `packages/cli/dist/index.js` and exposed via a root script:

   ```bash
   # See available commands and options
   npm run cli -- --help

   # Run scan against a config in the current working directory
   npm run cli -- scan --config figma-sync.config.json

   # Generate design spec and Figma instruction set
   npm run cli -- generate-spec --config figma-sync.config.json

   # Serve artifacts over HTTP (for the plugin)
   npm run cli -- serve --config figma-sync.config.json
   ```

   The `npm run cli -- ...` form is the **preferred way to run the CLI when working inside this monorepo**.

4. **Run tests** (core + CLI)

   ```bash
   npm test
   ```

   This runs Vitest with coverage across the core and CLI packages. For focused work you can run a subset directly, for example:

   ```bash
   npx vitest run packages/core/src/spec/buildDesignSpec.test.ts
   ```

---

## Using figma-sync in a Next.js app

For full code→Figma→code flows, follow:

- `docs/getting-started.md` – how to:
  - Install/build this repo.
  - Install or link the CLI into a Next.js + Tailwind app.
  - Create `figma-sync.config.json`.
  - Run `scan`, `generate-spec`, `serve`, `generate-patches`, `apply-patches`.
  - Build and link the Figma plugin.

That doc is the canonical end‑user walkthrough; this README is focused on contributors.

---

## Contributing & development guidelines

- **Tests and coverage**
  - Aim for **100% coverage** on all non‑plugin logic (core + CLI), per `docs/figma-sync-spec.md`.
  - Keep logic pure where possible (no I/O), and push side effects to small adapter layers (e.g. Node env, HTTP).
- **Packages**
  - Add new models and transforms in `packages/core` and cover them with unit tests.
  - Expose new CLI behavior by wiring core functions into commands in `packages/cli/src/index.ts` and `packages/cli/src/commands/*`.
  - Keep the plugin thin: it should mostly translate between Figma’s API and the `FigmaInstructionSet` / `FigmaChangeSet` models.
- **Docs as source of truth**
  - If behavior changes in a meaningful way, update the spec and/or `docs/outstanding-work-v0.1.md` along with code.

If you’re unsure where a particular concept belongs (core vs CLI vs plugin), the spec in `docs/figma-sync-spec.md` is the best place to start.

