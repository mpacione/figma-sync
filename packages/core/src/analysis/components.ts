import ts from 'typescript';
import { CodeComponent, CodeComponentKind } from '../models/CodeModel';

export interface ComponentExtractionHeuristics {
  primitiveComponentPatterns: string[];
  excludeComponents: string[];
}

function classifyComponentKind(
  name: string,
  heuristics: ComponentExtractionHeuristics,
): CodeComponentKind {
  if (heuristics.excludeComponents.includes(name)) return 'unknown';
  if (heuristics.primitiveComponentPatterns.includes(name)) return 'primitive';
  return 'pattern';
}

function extractExportedComponentNames(sourceFile: ts.SourceFile): string[] {
  const names = new Set<string>();

  sourceFile.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const hasExport =
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ??
        false;
      if (hasExport && /^[A-Z]/.test(node.name.text)) {
        names.add(node.name.text);
      }
    }

    if (ts.isVariableStatement(node)) {
      const isExported =
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ??
        false;
      if (!isExported) return;
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && /^[A-Z]/.test(decl.name.text)) {
          names.add(decl.name.text);
        }
      }
    }
  });

  return Array.from(names);
}

function extractTailwindClasses(source: string): string[] {
  const classes = new Set<string>();
  const CLASSNAME_RE = /className\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = CLASSNAME_RE.exec(source)) !== null) {
    const raw = match[1];
    raw
      .split(/\s+/)
      .map((c) => c.trim())
      .filter(Boolean)
      .forEach((c) => classes.add(c));
  }
  return Array.from(classes);
}

export function extractComponentsFromSource(
  source: string,
  filePath: string,
  heuristics: ComponentExtractionHeuristics,
): CodeComponent[] {
  const tsSourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const names = extractExportedComponentNames(tsSourceFile);
  const tailwindClasses = extractTailwindClasses(source);

  return names.map<CodeComponent>((name) => ({
    name,
    sourceFile: filePath,
    exportedName: name,
    kind: classifyComponentKind(name, heuristics),
    props: [],
    usageExamples: [],
    tailwindClasses,
    childrenStructure: undefined,
  }));
}

