# Getting Started with figma-sync

This guide walks you through running the full figma-sync v0.1 pipeline against a Next.js + Tailwind app and the local Figma plugin.

**You will need:**

- This `figma-sync` repository cloned on your computer.
- A Next.js app that uses Tailwind CSS on your computer.
- The **Figma desktop app** installed, and you are logged in.
- A Figma file (a new empty file is fine) that you can use for figma-sync.
- (Optional) An OpenAI API key if you want LLM-based enrichment.

## First run TL;DR (for non-technical users)

This is the quickest possible overview of what you need to do. Later sections explain each step in more detail.

### Wizard-based first run (recommended)

If you are not comfortable with terminals or remembering many commands, the easiest way to try figma-sync is to let the CLI guide you like a setup wizard.

In a terminal window, run this **from anywhere** (you only need to know where your Next.js app lives on disk):

```bash
npx figma-sync wizard --project-root /path/to/your-next-app
```

Note: This command assumes the figma-sync CLI is already installed or linked (see **Section 2** below). If you used `npm link` from this repo, you can also run it as `figma-sync wizard --project-root /path/to/your-next-app`.

The wizard will:

- Check that your app folder has a `figma-sync.config.json` file (and create a starter one if needed).
- Help you pause and edit the config to add your Figma file key and correct paths.
- Analyze your code and generate all required `artifacts/*.json` files.
- Start a local figma-sync server for the Figma plugin to talk to.
- Give you simple, click-by-click instructions for what to do in the Figma desktop app.
- Wait for you to export changes from Figma, then turn those changes into code edits and apply them.

You can always come back to the detailed steps below if you want to understand or automate each individual command.

1. **Prepare the figma-sync tool (this repo)**
   - Make sure you have this `figma-sync` repository on your computer.
   - Open a terminal in the `figma-sync` folder.
   - Run:

     ```bash
     npm install
     npm run build
     ```

2. **Prepare your Next.js + Tailwind app**
   - Make sure you have a Next.js app that uses Tailwind CSS on your machine.
   - Open a terminal in your app's folder (the one with its `package.json`).
   - Install or link the CLI:
     - If the CLI has been published to npm: run `npm install --save-dev figma-sync-cli`.
     - If you are working locally with this repo, follow **Section 2** below for the `npm link` instructions.
   - In your app folder, create `figma-sync.config.json` at the project root and copy the example from `docs/figma-sync.config.example.json` in this repo. Adjust the paths to match your app structure.

3. **Set your OpenAI API key (optional)**
   - When you run `figma-sync generate-spec` or `figma-sync wizard`, the tool will automatically prompt you to paste your OpenAI API key if it's not already configured.
   - The key will be saved to the figma-sync repository's `.env` file (not your app folder).
   - This is optional. If you skip it, figma-sync will still work but will skip LLM-based enrichment.

4. **Generate artifacts from your code**
   - In your app folder, run:

     ```bash
     npx figma-sync scan --config figma-sync.config.json
     npx figma-sync generate-spec --config figma-sync.config.json
     ```

   - This creates an `artifacts/` folder in your app with JSON files that describe your code and the design spec.

5. **Start the figma-sync server**
   - In your app folder, run:

     ```bash
     FIGMA_SYNC_SERVE_PORT=7001 npx figma-sync serve --config figma-sync.config.json
     ```

   - Leave this terminal window open and running. The server will listen on `http://localhost:7001`.

6. **Load the plugin in the Figma desktop app**
   - Open the **Figma desktop app** (not the browser version).
   - In Figma, go to: **Plugins → Development → Link existing plugin…**
   - When asked for the manifest file, browse to this repo and select `packages/plugin/manifest.json`.

7. **Bootstrap your Figma file from code**
   - Open the Figma file that matches the `fileKey` you set in `figma-sync.config.json`.
   - In Figma, go to: **Plugins → figma-sync → Bootstrap from code**.
   - When the plugin asks for the server URL, accept the default `http://localhost:7001` (or type it in if needed).
   - Wait while the plugin creates pages, components, screens, and variables in your Figma file.

8. **Make a small change in Figma**
   - In the same Figma file, make a simple change so you can see the round-trip work:
     - For example, rename a component that figma-sync created, or change the value of a color/spacing variable.

9. **Export changes from Figma back to your app**
   - Still in Figma, go to: **Plugins → figma-sync → Export changes**.
   - If prompted, confirm the server URL (again, `http://localhost:7001`).
   - The plugin will send a change set to your server, which will write `artifacts/figma-changes.json` in your app folder.

10. **Turn Figma changes into code changes**
    - In a new terminal window in your app folder, run:

      ```bash
      npx figma-sync generate-patches --config figma-sync.config.json < artifacts/figma-changes.json
      npx figma-sync apply-patches --config figma-sync.config.json
      ```

    - These commands compute code edits and then apply them to your files.
    - Open your code editor (or run your app) and confirm that the change you made in Figma is now reflected in your code.

---

## 1. Install and build figma-sync (this repo)

1. Install dependencies:
   - `npm install`

2. Build all packages:
   - `npm run build`

Optional (local dev convenience): if you are working directly from this repo and want to call figma-sync from **any** folder, you can expose the CLI globally with `npm link`:

```bash
cd packages/core
npm link

cd ../cli
npm link
```

After that, `figma-sync --help` should work from any directory on your machine. This is only for local development; end users will typically install `figma-sync-cli` in their app repo via npm.

This produces `figma-sync-cli` and `figma-sync-core` in `packages/*/dist`, and the Figma plugin bundle in `packages/plugin/dist/main.js`.

For local development **from this repo itself**, you can run the CLI via:

- `npm run cli -- --help`
- `npm run cli -- scan --config figma-sync.config.json`

## 2. Link or install the CLI into your app repo

The typical usage is inside **your Next.js app repo** (not necessarily this repo).

Options:

- **Option A (npm, once published)**: From your app repo, install the CLI from npm, for example:

  ```bash
  npm install --save-dev figma-sync-cli
  ```

  After that, `npx figma-sync --help` should work from your app repo.

- **Option B (local dev with `npm link`)**: If you have this figma-sync repo checked out next to your app repo, you can link the CLI locally:

  1. In the figma-sync repo:



     ```bash
     cd packages/core
     npm link

     cd ../cli
     npm link
     ```

  2. In your Next.js app repo:

     ```bash
     npm link figma-sync-core figma-sync-cli
     ```

  After that, `npx figma-sync --help` should also work from your app repo.

Once you have installed or linked the CLI (Option A or B), you will run figma-sync commands *from your app repo* using the `figma-sync` binary:

```bash
figma-sync --help
figma-sync scan --config figma-sync.config.json
```

If you prefer, `npx figma-sync ...` also works (especially when you installed `figma-sync-cli` as a dev dependency in your app repo).

> Important: The `npm run cli -- ...` helper script exists **only** in this `figma-sync` monorepo. It will not work from your app repo; always use `figma-sync` / `npx figma-sync` there.

## 3. Create a figma-sync config in your app repo

In your Next.js + Tailwind app, create `figma-sync.config.json` at the project root.

You can start from the example in this repo:

- `docs/figma-sync.config.example.json`

Example shape:

```jsonc
{
  "projectName": "My Next.js App",
  "paths": {
    "uiComponentsGlob": "src/components/ui/**/*",
    "screenComponentsGlob": "app/**/page.tsx",
    "cssVariablesFiles": ["src/styles/tokens.css"],
    "tailwindConfig": "tailwind.config.ts"
  },
  "figma": {
    "fileKey": "YOUR_FIGMA_FILE_KEY",
    "pages": {
      "primitives": "System/Primitives",
      "patterns": "System/Patterns",
      "screens": "App/Screens"
    }
  },
  "llm": {
    "provider": "openai",
    "model": "gpt-4.1-mini",
    "temperature": 0.2,
    "maxTokens": 1024
  },
  "heuristics": {
    "primitiveComponentPatterns": ["Button", "Input", "Card"],
    "excludeComponents": []
  }
}
```

Adjust the globs and paths to match your app.

## 4. Configure your OpenAI API key (optional but recommended)

The figma-sync CLI will automatically prompt you for your OpenAI API key when you run commands that need it (like `generate-spec` or `wizard`).

If you prefer to set it up manually:

1. In the **figma-sync repository** (not your app repo), create a `.env` file at the root:

   ```bash
   FIGMA_SYNC_OPENAI_API_KEY=sk-...
   ```

2. Ensure your config has:

   - `llm.provider = "openai"`

If the API key is missing, `figma-sync` will prompt you to paste it, or you can skip LLM enrichment.

## 5. Run the code → Figma bootstrap

All commands below are run **in your app repo**:

1. **Scan the codebase**

   ```bash
   npx figma-sync scan --config figma-sync.config.json
   ```

   This writes `artifacts/code-model.json`.

2. **Generate the design spec & instruction set**

   ```bash
   npx figma-sync generate-spec --config figma-sync.config.json
   ```

   This writes:

   - `artifacts/design-spec.json`
   - `artifacts/figma-instructions.json`

3. **Serve artifacts over HTTP**

   ```bash
   FIGMA_SYNC_SERVE_PORT=7001 npx figma-sync serve --config figma-sync.config.json
   ```

   This starts a local HTTP server (default: `http://localhost:7001`) serving:

   - `/health`
   - `/code-model`
   - `/design-spec` and `/spec`
   - `/figma-instructions` and `/instructions`
   - `/figma-changes`
   - `/code-patches`

Leave this running while you use the plugin.

## 6. Install and run the Figma plugin

1. Build the plugin (in this repo):

   ```bash
   npm run build
   ```

   This produces `packages/plugin/dist/main.js` and uses `packages/plugin/manifest.json`.

2. In Figma, go to:

   - Plugins → Development → **Link existing plugin**.
   - Select `packages/plugin/manifest.json` from this repo.

3. In your Figma file (matching the `fileKey` in config):

   - Run **Plugins → figma-sync → Bootstrap from code**.
   - When prompted, confirm or adjust the server URL (default `http://localhost:7001`).
   - The plugin fetches `/figma-instructions` and applies operations to create pages, components, and screens.

## 7. Figma → code round-trip (renames & tokens)

1. In Figma, either:

   - Rename components or screens that were created by figma-sync, **and/or**
   - Adjust the values of variables created by figma-sync (e.g. design tokens in the Variables panel).

2. Run **Plugins → figma-sync → Export changes**.

   - If there are rename or variable changes, you will be prompted for the server URL.
   - The plugin POSTs a `FigmaChangeSet` to `/figma-changes` on your local server, including both rename and `UpdateVariable` entries.

3. Back in your app repo, generate code patches:

   ```bash
   npx figma-sync generate-patches --config figma-sync.config.json < artifacts/figma-changes.json
   ```

   This writes `artifacts/code-patches.json`.

4. Apply patches to your codebase:

   ```bash
   npx figma-sync apply-patches --config figma-sync.config.json
   ```

   This reads `artifacts/code-patches.json`, applies diffs to your files, and logs any changes.

## 8. Validation (optional)

From your app repo, you can validate artifacts against schemas:

```bash
npx figma-sync validate --config figma-sync.config.json
```

This checks the config and (if present) `code-model.json`, `design-spec.json`, `figma-instructions.json`, and `code-patches.json`.

## 9. Expected artifacts after a first run

After you follow the steps above (scan → generate-spec → serve → plugin bootstrap/export → generate-patches → apply-patches), you should see these files in your app repo:

- `artifacts/code-model.json` – snapshot of components, screens, and tokens.
- `artifacts/design-spec.json` – design specification derived from the CodeModel.
- `artifacts/figma-instructions.json` – operations the plugin uses to create pages, components, screens, and variables.
- `artifacts/figma-changes.json` – change set exported from Figma (rename + variable updates).
- `artifacts/code-patches.json` – code patch set derived from `figma-changes.json`.
