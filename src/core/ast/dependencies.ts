/**
 * Vizier AST Engine — Tool 6: get_dependencies
 *
 * Extracts a file's imports/requires and what symbols are imported.
 * Handles ESM imports, CommonJS require() calls, and Python imports.
 */

import { CachedTree } from "./parser-engine";
import { walkNamed } from "./workspace-graph";

export interface ImportInfo {
  source: string; // module specifier, without quotes
  symbols: string[]; // imported names (empty for side-effect-only imports)
  kind: "esm" | "commonjs" | "python";
}

export interface DependenciesResult {
  file: string;
  imports: ImportInfo[];
  count: number;
}

const STRING_QUOTE = /^['"`](.*)['"`]$/;

function stripQuotes(text: string): string {
  const m = text.trim().match(STRING_QUOTE);
  return m ? m[1] : text.trim();
}

export function getDependencies(filePath: string, cached: CachedTree): DependenciesResult {
  const imports: ImportInfo[] = [];
  const root = cached.tree.rootNode;

  walkNamed(root, (node) => {
    // ESM: import ... from "source" / import "source" / import("source")
    if (node.type === "import_statement") {
      const sourceNode = node.childForFieldName("source");
      if (sourceNode) {
        const source = stripQuotes(sourceNode.text);
        const symbols: string[] = [];
        // Collect named/default/namespace imports via their specific node types.
        walkNamed(node, (n) => {
          if (n.type === "import_specifier") {
            const nameNode = n.childForFieldName("name") ?? n.namedChildren[0];
            if (nameNode) symbols.push(nameNode.text);
          } else if (n.type === "namespace_import") {
            // No "name" field in this grammar build — the identifier is the
            // first named child.
            const nameNode = n.childForFieldName("name") ?? n.namedChildren[0];
            if (nameNode) symbols.push(`* as ${nameNode.text}`);
          }
        });
        imports.push({ source, symbols, kind: "esm" });
      }
    }

    // Dynamic import().
    if (node.type === "call_expression") {
      const fn = node.childForFieldName("function");
      if (fn && fn.text === "require") {
        const args = node.childForFieldName("arguments");
        const source = args ? stripQuotes(args.namedChildren.map((c) => c.text).join("")) : "";
        if (source) imports.push({ source, symbols: [], kind: "commonjs" });
      }
    }

    // Python: import a.b / import a.b as c / from a import b, c
    if (node.type === "import_statement" || node.type === "import_from_statement") {
      const sourceNode = node.childForFieldName("module") ?? node.childForFieldName("name");
      const source = sourceNode ? sourceNode.text : "";
      if (source) {
        const symbols: string[] = [];
        if (node.type === "import_from_statement") {
          walkNamed(node, (n) => {
            if (n.type === "dotted_name" && n.parent?.type !== "import_from_statement") {
              symbols.push(n.text);
            }
          });
          // Fallback: names in an import_list are identifiers/dotted_names.
          const importList = node.namedChildren.find((c) => c.type === "import_list");
          if (importList) {
            symbols.length = 0;
            walkNamed(importList, (n) => {
              if (n.type === "dotted_name" || n.type === "identifier") symbols.push(n.text);
            });
          }
        }
        imports.push({ source, symbols, kind: "python" });
      }
    }
  });

  return { file: filePath, imports, count: imports.length };
}