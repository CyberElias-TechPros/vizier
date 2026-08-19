/**
 * Vizier AST Engine — Tool 2: get_function_hierarchy
 *
 * Returns the call graph around a function/method: what it calls (callees)
 * and what calls it (callers), expanded up to a depth. The workspace graph
 * is built by buildWorkspaceGraph() over the cached parse trees.
 */

import { CachedTree, nearestDeclaration, symbolName, nodeAtPosition, SimpleRange } from "./parser-engine";
import {
  WorkspaceGraph,
  calleesOf,
  callersOf,
  expandCalls,
  findDeclarations
} from "./workspace-graph";

export interface FunctionNode {
  file: string;
  name: string;
  kind: string;
  range: SimpleRange;
  callees: string[];
}

export interface FunctionHierarchyResult {
  symbol: FunctionNode;
  callers: FunctionNode[];
  callees: FunctionNode[];
}

export function getFunctionHierarchy(
  filePath: string,
  cached: CachedTree,
  graph: WorkspaceGraph,
  line: number,
  depth: number = 2
): FunctionHierarchyResult | null {
  const row = line - 1;
  // Use the end of the line as the probe column: column 0 lands on the
  // enclosing class wrapper rather than the method itself.
  const lines = cached.text.split(/\r?\n/);
  const column = (lines[row] ?? "").length;
  const leaf = nodeAtPosition(cached.tree.rootNode, row, column);
  if (!leaf) return null;

  const decl = nearestDeclaration(leaf);
  if (!decl) return null;
  const name = symbolName(decl);
  if (!name) return null;

  const key = `${filePath}::${name}`;
  const self = graph.symbols.get(key);
  if (!self) return null;

  const symbol: FunctionNode = {
    file: self.file,
    name: self.name,
    kind: self.kind,
    range: self.range,
    callees: calleesOf(graph, key)
  };

  // Direct callees: resolve each name to its declarations.
  const callees: FunctionNode[] = [];
  for (const calleeName of symbol.callees) {
    for (const declRef of findDeclarations(graph, calleeName)) {
      callees.push({
        file: declRef.file,
        name: declRef.name,
        kind: declRef.kind,
        range: declRef.range,
        callees: calleesOf(graph, `${declRef.file}::${declRef.name}`)
      });
    }
  }

  // Callers: symbols whose edges include this symbol's name.
  const callers: FunctionNode[] = [];
  for (const callerKey of callersOf(graph, name)) {
    const callerRef = graph.symbols.get(callerKey);
    if (!callerRef) continue;
    callers.push({
      file: callerRef.file,
      name: callerRef.name,
      kind: callerRef.kind,
      range: callerRef.range,
      callees: calleesOf(graph, callerKey)
    });
  }

  // Depth expansion for the caller side too, so a depth > 1 query shows
  // the transitive "who calls the callers" chain.
  if (depth > 1) {
    const expanded = expandCalls(graph, key, depth);
    for (const level of expanded) {
      if (level.key === key) continue;
      const ref = level.ref;
      if (!ref) continue;
      // Avoid duplicating entries already added above.
      const exists = [...callers, ...callees].some((n) => n.file === ref.file && n.name === ref.name);
      if (!exists) {
        const node: FunctionNode = {
          file: ref.file,
          name: ref.name,
          kind: ref.kind,
          range: ref.range,
          callees: level.callees
        };
        callers.push(node);
      }
    }
  }

  return { symbol, callers, callees };
}