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
  const declaredNames = new Set<string>();

  // First pass: collect all declared function/const names that start with uppercase
  sourceFile.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      if (/^[A-Z]/.test(node.name.text)) {
        declaredNames.add(node.name.text);
      }
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
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && /^[A-Z]/.test(decl.name.text)) {
          declaredNames.add(decl.name.text);
          if (isExported) {
            names.add(decl.name.text);
          }
        }
      }
    }

    // Handle export { Button, Card } syntax
    if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          const exportedName = element.name.text;
          // Only include if it's a declared component (starts with uppercase)
          if (declaredNames.has(exportedName)) {
            names.add(exportedName);
          }
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

/**
 * Parse cva() function calls to extract structured Tailwind classes
 */
function extractCvaClasses(sourceFile: ts.SourceFile): {
  base: string[];
  variants: Record<string, Record<string, string[]>>;
} | undefined {
  let result: { base: string[]; variants: Record<string, Record<string, string[]>> } | undefined;

  function visit(node: ts.Node) {
    // Look for cva() call expressions
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      if (ts.isIdentifier(expression) && expression.text === 'cva') {
        // cva(baseClasses, { variants: {...} })
        const args = node.arguments;
        if (args.length >= 1) {
          const base: string[] = [];
          const variants: Record<string, Record<string, string[]>> = {};

          // First argument: base classes (string literal)
          const baseArg = args[0];
          if (ts.isStringLiteral(baseArg)) {
            const baseClasses = baseArg.text.split(/\s+/).filter(Boolean);
            base.push(...baseClasses);
          }

          // Second argument: config object with variants
          if (args.length >= 2 && ts.isObjectLiteralExpression(args[1])) {
            const configObj = args[1];
            for (const prop of configObj.properties) {
              if (
                ts.isPropertyAssignment(prop) &&
                ts.isIdentifier(prop.name) &&
                prop.name.text === 'variants' &&
                ts.isObjectLiteralExpression(prop.initializer)
              ) {
                // variants: { variant: {...}, size: {...} }
                const variantsObj = prop.initializer;
                for (const variantProp of variantsObj.properties) {
                  if (
                    ts.isPropertyAssignment(variantProp) &&
                    ts.isIdentifier(variantProp.name) &&
                    ts.isObjectLiteralExpression(variantProp.initializer)
                  ) {
                    const variantName = variantProp.name.text;
                    variants[variantName] = {};

                    // variant: { default: '...', destructive: '...' }
                    const variantValuesObj = variantProp.initializer;
                    for (const valueProp of variantValuesObj.properties) {
                      if (ts.isPropertyAssignment(valueProp) && ts.isStringLiteral(valueProp.initializer)) {
                        const valueName = ts.isIdentifier(valueProp.name)
                          ? valueProp.name.text
                          : ts.isStringLiteral(valueProp.name)
                            ? valueProp.name.text
                            : '';
                        if (valueName) {
                          const classes = valueProp.initializer.text.split(/\s+/).filter(Boolean);
                          variants[variantName][valueName] = classes;
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          result = { base, variants };
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return result;
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
  const cvaClasses = extractCvaClasses(tsSourceFile);

  return names.map<CodeComponent>((name) => ({
    name,
    sourceFile: filePath,
    exportedName: name,
    kind: classifyComponentKind(name, heuristics),
    props: [],
    usageExamples: [],
    tailwindClasses,
    tailwindClassesStructured: cvaClasses,
    childrenStructure: undefined,
  }));
}

