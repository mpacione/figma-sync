# Maintainers Guide

This guide is for contributors working on the figma-sync monorepo itself. It complements:

- `docs/figma-sync-spec.md` – the v0.1 product/architecture spec.
- `docs/getting-started.md` – end-user walkthrough for a Next.js app + Figma.
- `docs/outstanding-work-v0.1.md` – tracked remaining v0.1 work.

---

## High-level architecture

**Packages:**

- `packages/core` (`figma-sync-core`)
  - Owns all versioned data models and pure logic:
    - `CodeModel`, `DesignSpec`, `FigmaInstructionSet`, `FigmaChangeSet`, `CodePatchSet`.
    - Analysis (components/screens/tokens), spec building, instruction generation, patch building, patch application.
  - No direct Node/Figma I/O – everything is expressed in terms of plain data.

- `packages/cli` (`figma-sync-cli`)
  - Wraps core into a Node.js CLI and optional HTTP server.
  - Handles filesystem, process, and HTTP I/O, but delegates all semantics to core.

- `packages/plugin` (`figma-sync-plugin`)
  - Figma plugin that:
    - Fetches `FigmaInstructionSet` over HTTP and applies it to a Figma file.
    - Exports changes from the Figma file as a `FigmaChangeSet` and POSTs it back.
  - Should stay thin and primarily translate between Figma’s API and core models.

- `docs/`
  - Specs, getting-started, and this guide.

---

## Data flows (mental model)

### Code → Figma

1. **Scan** (`scan`)
   - CLI reads `figma-sync.config.*`.
   - Uses core analysis to produce `artifacts/code-model.json`.

2. **Generate spec** (`generate-spec`)
   - CLI loads `code-model.json`.
   - Core builds `DesignSpec` + `FigmaInstructionSet`.
   - CLI writes `artifacts/design-spec.json` and `artifacts/figma-instructions.json`.

3. **Serve** (`serve`)
   - CLI hosts HTTP endpoints (e.g. `/health`, `/code-model`, `/design-spec`, `/figma-instructions`, `/figma-changes`, `/code-patches`).

4. **Plugin apply** (`bootstrap-from-code`)
   - Plugin prompts for server URL (default `http://localhost:7001`).
   - GETs `/figma-instructions` and applies operations in order (pages → variables → components → screens).

### Figma → Code

1. **Plugin export** (`export-changes`)
   - Plugin walks tagged nodes/variables and detects:
     - Component and screen renames.
     - Variable value changes.
   - Builds a `FigmaChangeSet` and POSTs to `/figma-changes` on the local server.

2. **Generate patches** (`generate-patches`)
   - CLI reads `FigmaChangeSet` and relevant artifacts.
   - Core turns changes into a `CodePatchSet` of hunks.
   - CLI writes `artifacts/code-patches.json`.

3. **Apply patches** (`apply-patches`)
   - CLI reads `code-patches.json` and calls core patch application.
   - Files are updated in place, with strict/lenient modes as per core.

---

## CLI command reference (maintainer view)

Implementation lives primarily under `packages/cli/src`:

- `index.ts`
  - Defines `createProgram` (Commander) and `runCli(argv)`.
  - Registers subcommands and options.
  - When executed as a Node entrypoint, runs `runCli(process.argv)`.
  - In this monorepo, the CLI is usually invoked via `npm run cli -- ...`; in a user's app repo, it is invoked as `figma-sync ...` / `npx figma-sync ...` after `figma-sync-cli` is installed or linked.

- `commands/*.ts`
  - `scan.ts` – builds `CodeModel` with core analysis.
  - `generateSpec.ts` – builds `DesignSpec` + `FigmaInstructionSet`.
  - `serve.ts` – HTTP server exposing artifacts and change/patche endpoints.
  - `generatePatches.ts` – builds `CodePatchSet` from `FigmaChangeSet`.
  - `applyPatches.ts` – applies `CodePatchSet` to files.
  - `validate.ts` – validates config and any existing artifacts against schemas.

- `config/loadConfig.ts`
  - Loads `figma-sync.config.{json,js,ts}` and validates via core.

- `io/nodeEnv.ts`
  - All filesystem/process/HTTP I/O the CLI uses.

When adding or changing a command:

1. Put pure logic in core first (new model or transformation).
2. Add a thin command handler in `packages/cli/src/commands/*`.
3. Wire it into the CLI in `index.ts` and cover behavior with tests.

---

## Plugin behavior notes

- Entry: `packages/plugin/src/main.ts`.
- Manifest: `packages/plugin/manifest.json` (v2, commands `bootstrap-from-code`, `export-changes`).
- The plugin should:
  - Use plugin data keys (e.g. original name, mapping IDs) to track what came from figma-sync.
  - Apply instructions in the correct order (pages → variables → components → screens).
  - Emit `FigmaChangeSet` entries that match core expectations (renames + variable updates).

If you change instruction or change-set shapes, update both core models and plugin logic, plus the spec.

---

## Guidance for extending the system

- **Keep core pure**
  - New behaviors should start in `packages/core` as pure functions over typed data models.
  - Favor small, composable transforms with focused tests.

- **Add I/O only at the edges**
  - CLI and plugin should adapt environments to/from core models.
  - Avoid reaching directly into Node/Figma APIs from core.

- **Update docs alongside code**
  - If you introduce a new concept or flow, update:
    - `docs/figma-sync-spec.md` – for product/architecture behavior.
    - `docs/outstanding-work-v0.1.md` – to track remaining or completed work.
    - This guide – if maintainer-facing workflows change.

- **Tests & coverage**
  - For new logic in core/CLI, add Vitest tests and keep coverage at 100% for non-plugin code.
  - For plugin changes, prefer extracting pure helpers where possible and testing them with synthetic Figma node/variable structures.

