# `figma-sync` – Code⇄Figma Sync Tool Spec v0.1

**Core requirement**: 100% unit test coverage (statements/branches/functions/lines) for all non-plugin code.

## 1. Goals/Non-Goals

### Goals
1. **Code→Figma bootstrap**: Parse repo, generate minimal Figma design system with:
   - Design tokens (colors/radii/spacing/typography) as variables/styles
   - Key primitives (`Button`/`Input`/`Card`) as Figma components  
   - App screens (route pages) as frames
   - Structure: Pages `System/Primitives`, `System/Patterns`, `App/Screens`

2. **Figma→Code pullback**: Extract updated variables/tokens + component changes, and derive code patch suggestions. In v0.1 these suggestions are deterministic for renames and design tokens; future versions may introduce LLM-based patching for more complex refactors.

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
2. **Generate patches** (`figma-sync generate-patches`): deterministically derive token/component diffs for renames and design tokens in v0.1, writing `artifacts/code-patches.json`. Future versions may delegate more complex refactors to an LLM.
3. **Manual apply**: Developer reviews/applies

## 5. CLI Commands

- `scan --config`: Parse repo→`artifacts/code-model.json`
- `generate-spec`: Model+LLM→`artifacts/design-spec.json`+`figma-instructions.json`
- `serve --port`: HTTP server (GET spec/instructions, POST changes)
- `generate-patches`: Changes→`artifacts/code-patches.json` (deterministic renames + design token updates in v0.1)
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
1. Component classification: Input(name/props/JSX/tokens)→Output(JSON:classification/variants/states)
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

