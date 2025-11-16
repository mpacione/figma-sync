# figma-sync v0.1 – Outstanding Work

This file tracks the remaining work needed to bring `figma-sync` to a solid v0.1 per `docs/figma-sync-spec.md`.

## 1. End-to-end functional pipeline

- **Scan → CodeModel**
  - Validate that `scan` reliably finds the correct files based on config:
    - `paths.uiComponentsGlob` (e.g. `src/components/ui/**/*`).
    - `paths.screenComponentsGlob` (e.g. `app/**/page.tsx`).
    - `paths.cssVariablesFiles` (CSS token sources).
  - Sanity-check `CodeModel` on a real/synthetic Next.js + Tailwind app: components, screens, tokens are all present and sensible.
  - Extend token extraction beyond CSS color variables to also derive radii/spacing/typography tokens (from CSS and/or Tailwind config) and populate the corresponding `CodeTokens` fields.
    - **Status**: Implemented in `buildCodeModel` + `extractCssDesignTokens` with tests.

- **CodeModel → DesignSpec → FigmaInstructionSet → plugin executor**
  - Verify `buildDesignSpec` and `buildFigmaInstructionSet` produce:
    - Pages: `System/Primitives`, `System/Patterns`, `App/Screens`.
    - Reasonable `DesignComponentSpec` and `DesignScreenSpec` mappings from code.
  - Ensure generated instruction sets include variable creation operations for design tokens (colors, radii, spacing, typography) and that the plugin can execute them in the expected order (pages → variables → components → screens).
    - **Status**: `DesignSpec.variables` now surfaces all token types into collections (`Colors`, `Radii`, `Spacing`, `Typography`), `buildFigmaInstructionSet` emits `CreateVariableCollection` and `CreateVariable` ops, and the plugin's `applyInstructions` creates matching Figma variables (with default mode values) via the variables API.

- **Figma changes → CodePatchSet → applied files**
  - Confirm that `buildCodePatchesForChanges` + `applyCodePatchSetToFiles` work end to end:
    - Input: `FigmaChangeSet` from plugin (renames **and** variable value changes).
    - Output: `CodePatchSet` written to `artifacts/code-patches.json` and applied cleanly by `apply-patches`.
  - Define scope for v0.1 in line with the spec:
    - Support both rename changes and token/variable changes (for design tokens) in the `FigmaChangeSet` and patch pipeline.
      - **Status**: `FigmaChangeSet` now includes `UpdateVariable` changes (emitted by the plugin when a Figma variable's default mode value differs from its original value) and `buildCodePatchesForChanges` converts these into `CodePatch` hunks that update the underlying CSS/number literals for the corresponding code tokens.
    - Keep plugin + core in sync with that decision and document any stretch goals beyond tokens (e.g. complex component layout changes).


- **CodeModel → DesignSpec → FigmaInstructionSet**
  - Verify `buildDesignSpec` and `buildFigmaInstructionSet` produce:
    - Pages: `System/Primitives`, `System/Patterns`, `App/Screens`.
    - Reasonable `DesignComponentSpec` and `DesignScreenSpec` mappings from code.
  - Ensure generated instruction sets include variable creation operations for design tokens (colors, radii, spacing, typography) and that the plugin can execute them in the expected order (pages  variables  components  screens).

- **Figma changes → CodePatchSet → applied files**
  - Confirm that `buildCodePatchesForChanges` + `applyCodePatchSetToFiles` work end to end:
    - Input: `FigmaChangeSet` from plugin (at least renames).
    - Output: `CodePatchSet` written to `artifacts/code-patches.json` and applied cleanly by `apply-patches`.
  - Define scope for v0.1 in line with the spec:
    - Support both rename changes and token/variable changes (for design tokens) in the `FigmaChangeSet` and patch pipeline.
    - Keep plugin + core in sync with that decision and document any stretch goals beyond tokens (e.g. complex component layout changes).

## 2. Figma plugin: manifest + behavior

- **Manifest v2**
  - Add a `manifest.json` for `figma-sync-plugin` with:
    - Main entry: `dist/main.js`.
    - Two commands (per spec):
      - `bootstrap-from-code` → apply instructions from the local server.
      - `export-changes` → collect changes and POST them back.
  - Ensure `figma.command` values in `main.ts` match these manifest command IDs.

- **Server URL handling**
  - Implement a minimal UX to configure the server URL:
    - Prompt the user for the URL, defaulting to `http://localhost:7001`.
    - Store the last-used URL in plugin data for reuse.

- **Operation coverage**
  - Current plugin implements a subset of operations in `applyInstructions`:
    - `CreatePage`, `CreateScreenFrame`, `CreateComponent`, `ReparentNode`, `RenameNode`.
  - For v0.1, extend the pipeline to support variable-related operations rather than restricting the instruction set:
    - Ensure `buildFigmaInstructionSet` emits `CreateVariableCollection` and `CreateVariable` operations for all design variables.
    - Implement corresponding handlers in the plugin's `applyInstructions` using the Figma variables API (and consider initial support for `ApplyVariablesToLayers` or explicitly leave it unused).

- **Change collection semantics**
  - `collectFigmaChanges` currently:
    - Walks the node tree.
    - Uses plugin data keys for `originalName`, `designComponentId`, `screenId` to detect renames.
  - For v0.1:
    - Treat rename-only support as a baseline and also represent token/variable changes explicitly.
    - Design change types for variable updates and extend:
      - Plugin collection logic to emit token/variable changes.
      - `FigmaChangeSet` model and `buildCodePatchesForChanges` (and LLM prompts, if used) to map those changes back to code tokens.

## 3. Spec alignment and API/UX polish

- **HTTP endpoints**
  - Server currently supports:
    - `GET /health`, `GET /`.
    - `GET /code-model`, `GET /design-spec`, `GET /figma-instructions`, `GET /figma-changes`, `GET /code-patches`.
    - Aliases: `GET /spec` (design-spec), `GET /instructions` (figma-instructions).
  - Keep these in sync with the spec and plugin expectations.

- **Command names and behavior**
  - CLI command set is correct: `scan`, `generate-spec`, `serve`, `generate-patches`, `apply-patches`, `validate`.
  - Plugin command names still need to fully match spec (`bootstrap-from-code`, `export-changes`).

- **Artifacts layout**
  - Spec text says: `generate-patches` → `artifacts/patches/`.
  - Current implementation uses: `artifacts/code-patches.json`.
  - Decide whether to:
    - Keep the single JSON file and update docs/spec wording, **or**
    - Move to a directory-based layout and adjust CLI + tests.

## 4. Config & documentation

- **Config story**
  - Provide a canonical `figma-sync.config.json` or `.js` example with:
    - Example globs for components/screens/CSS variables.
    - Example Figma metadata and LLM config.
  - Ensure `loadConfigFromFile` + `parseConfig` + `zFigmaSyncConfig` cover the expected shape and nice error messages.

- **LLM / API key setup**
  - Document how to use OpenAI in v0.1:
    - `config.llm.provider = 'openai'`.
    - `FIGMA_SYNC_OPENAI_API_KEY` read from environment.
  - Clarify behavior when no key is present (LLM step skipped / base spec only).

- **Getting started guide**
  - **Status**: Implemented as `docs/getting-started.md`, which walks through the “happy path”:
    1. Install + build the monorepo.
    2. Create `figma-sync.config.*` in a Next.js+Tailwind project.
    3. Run `figma-sync scan` → `figma-sync generate-spec`.
    4. Run `figma-sync serve`.
    5. Build and install the Figma plugin (manifest + JS bundle).
    6. Use `bootstrap-from-code` and `export-changes` inside Figma.
    7. Run `generate-patches` and `apply-patches` to propagate changes back to code.

- **Maintainers documentation**
  - **Status**: Maintainer guide added at `docs/maintainers-guide.md` (architecture, flows, CLI reference, plugin notes, extension guidance).

## 5. Tests & coverage (to be done after features stabilize)

- Restore all tests to passing across CLI and core packages (defer while feature work is ongoing).
  - **Status**: Core + CLI tests are currently all passing after fixing CLI wiring and removing stale JS artifacts from `packages/cli/src`.
- Drive coverage back to 100% for non-plugin logic (per spec):
  - Code analysis, spec building, instruction generation.
  - Config parsing/validation, HTTP server behavior, CLI command wiring.
  - LLM wrapper behavior (including error handling) with mocked HTTP.
- Optionally extract pure helpers from the plugin and add unit tests using mocks/synthetic node trees.

## Appendix: Original v0.1 Spec (reference)

### `figma-sync` – Code⇄Figma Sync Tool Spec v0.1

**Core requirement**: 100% unit test coverage (statements/branches/functions/lines) for all non-plugin code.

## 1. Goals/Non-Goals

### Goals
1. **Code→Figma bootstrap**: Parse repo, generate minimal Figma design system with:
   - Design tokens (colors/radii/spacing/typography) as variables/styles
   - Key primitives (`Button`/`Input`/`Card`) as Figma components
   - App screens (route pages) as frames
   - Structure: Pages `System/Primitives`, `System/Patterns`, `App/Screens`

2. **Figma→Code pullback**: Extract updated variables/tokens + component changes, use LLM for code patch suggestions (not auto-apply)

3. **Local-only**: Node.js CLI + optional HTTP server, user-provided LLM API key, no external SaaS

4. **Extensible/testable**: Clear layers (code analysis/LLM/design spec/Figma integration)

### Non-Goals v0.1
- No continuous sync, idempotent round-trip, legacy migration, or non-React/TS/Next+Tailwind support

## 2. Architecture

**Components**:
- **CLI** (`figma-sync-cli`): Analyze codebase→Code Model, call LLM→Design Spec, host HTTP server, derive patches
- **Core Library** (`figma-sync-core`): Shared types, transformations, validation
- **Figma Plugin** (`figma-sync-plugin`): Fetch/apply Design Spec, extract/POST changes
- **Config** (`figma-sync.config.{ts,js,json}`): Paths, patterns, Figma metadata, LLM config, heuristics

## 3. Data Models

All models: versioned schemas, runtime validation, test coverage.

### 3.1 CodeModel
```ts
version: "1.0"
projectMeta: {name, framework:nextjs|react|other, tailwindEnabled}
tokens: {colors:CodeColorToken[], radii/spacing/typography:[]}
components: CodeComponent[]
screens: CodeScreen[]

CodeColorToken: {name, source:css-variable|tailwind-theme|inline, value:{hex,alpha?}, darkModeValue?, usageCount, locations:FilePosition[]}
CodeComponent: {name, sourceFile, exportedName, kind:primitive|pattern|screenFragment|unknown, props:CodeComponentProp[], usageExamples, tailwindClasses:string[], childrenStructure}
CodeScreen: {route, componentName, filePath, usesComponents:string[], description?}
```

### 3.2 DesignSpec
```ts
version: "1.0"
projectMeta, variables:DesignVariablesSpec, styles:DesignStylesSpec
components: DesignComponentSpec[], screens: DesignScreenSpec[]
pages: DesignPageSpec[], mapping: IdMapping

DesignVariablesSpec: Collections/modes/variables with {id, collectionId, name, type:COLOR|FLOAT|STRING|BOOLEAN, modeValues, scopes}
DesignComponentSpec: {id, name, category:primitive|pattern, sourceComponentName, propsModel:{variantProps, slotProps}, exampleVariants, placement:{page,section,gridPosition}}
DesignScreenSpec: {id, route, name, componentsUsed, layoutHints, states:["default","empty","error"]}
DesignPageSpec: {name, kind:system-primitives|system-patterns|screens|other, sections?}
IdMapping: {codeComponentToDesignId, codeTokenToVariableId, routeToScreenId}
```

### 3.3 FigmaInstructionSet
```ts
version: "1.0"
operations: FigmaOperation[]

Operation types: CreatePage, EnsurePage, CreateComponent/Set/Variant, CreateFrame/ScreenFrame, CreateVariableCollections/Variables, ApplyVariablesToLayers, ReparentNode, RenameNode
Each op: unique id, refers to internal IDs from DesignSpec
```

## 4. User Flows

### 4.1 Code→Figma
1. **Setup**: Install tool, create config with:
   - Source paths: `uiComponentsGlob`, `screenComponentsGlob`, `cssVariablesFiles`, `tailwindConfig`
   - LLM: provider/model/temperature
   - Figma: fileKey, page names

2. **Scan** (`figma-sync scan`): Parse TS/JSX→components/screens/tokens→`code-model.json`

3. **Generate** (`figma-sync generate-spec`): Load model, call LLM for classification/variants/states→`design-spec.json`

4. **Serve** (`figma-sync serve`): HTTP endpoints `/spec`, `/instructions`, `POST /figma-changes`

5. **Apply** (Plugin): Fetch instructions, apply operations (pages→variables→components→screens)

### 4.2 Figma→Code
1. **Collect**: Plugin exports changes→POST to `/figma-changes`
2. **Generate patches** (`figma-sync generate-patches`): LLM suggests token/component diffs→`patches/`
3. **Manual apply**: Developer reviews/applies

## 5. CLI Commands

- `scan --config`: Parse repo→`artifacts/code-model.json`
- `generate-spec`: Model+LLM→`artifacts/design-spec.json`+`figma-instructions.json`
- `serve --port`: HTTP server (GET spec/instructions, POST changes)
- `generate-patches`: Changes+LLM→`artifacts/patches/`
- `validate`: Check config/schemas

**Config structure**:
```ts
{projectName, paths:{uiComponentsGlob, screenComponentsGlob, cssVariablesFiles, tailwindConfig},
figma:{fileKey, pages:{primitives,patterns,screens}}, llm:{provider,model,temperature,maxTokens},
heuristics:{primitiveComponentPatterns,excludeComponents}}
```

## 6. Figma Plugin

**Manifest**: v2, commands: `bootstrap-from-code`, `export-changes`

**Logic**:
- Bootstrap: Prompt URL→GET instructions→apply ops→report
- Export: Traverse tagged pages→collect variables/components→POST changes

## 7. LLM Integration

**Interface**: `LLMClient.generate(prompt,options)`, `generateJSON<T>(prompt,schema)`

**Prompts**:
1. Component classification: Input(name/props/JSX/tokens)Output(JSON:classification/variants/states)
2. Patch suggestion: Input(code/changes)→Output(JSON:file/line/diff)

All prompts→strict validated JSON.

## 8. Testing Requirements

**100% coverage scope**: All CLI+core code (parsers/heuristics/spec-creation/instruction-gen/config/HTTP/LLM-wrapper)

**Plugin**: Pure functions tested via mocks

**Config**: `coverageThreshold:{global:{statements:100,branches:100,functions:100,lines:100}}`

**Strategies**:
- Code extraction: synthetic fixtures→assert CodeModel fields
- Design spec: mock LLM→assert DesignSpec structure
- Instructions: DesignSpec→assert operation order/dependencies
- HTTP: supertest GET/POST endpoints
- LLM wrapper: mock HTTP→assert request/error-handling
- Plugin utils: mock node trees→test mappings

**CI**: Fail if <100%, validate command

## 9. Error Handling

**CLI**: Non-zero exit, readable errors (missing config/LLM failures/wrong order)

**Plugin**: Clear errors (no localhost/invalid JSON/partial failures→continue+report)

## 10. Security

- LLM: minimal snippets only, no secrets
- Server: localhost-only bind, optional token
- Storage: local `./artifacts` only

## 11. Future (Out-of-scope)

Continuous sync, robust auto-refactors, multi-repo, multi-file libraries
