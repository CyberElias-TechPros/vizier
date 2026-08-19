/**
 * Vizier AST Engine — Tool 3: get_class_hierarchy
 *
 * For a class at a position, return its parent class, child classes, and
 * implemented interfaces, resolved from the workspace class graph.
 */

import { CachedTree, nearestDeclaration, symbolName, nodeAtPosition, SimpleRange } from "./parser-engine";
import { WorkspaceGraph, ClassInfo } from "./workspace-graph";

export interface ClassHierarchyResult {
  name: string;
  file: string;
  range: SimpleRange;
  parents: string[];
  children: string[];
  interfaces: string[];
}

export function getClassHierarchy(
  filePath: string,
  cached: CachedTree,
  graph: WorkspaceGraph,
  line: number
): ClassHierarchyResult | null {
  const row = line - 1;
  // Probe at end-of-line so the lookup lands inside the class body.
  const lines = cached.text.split(/\r?\n/);
  const column = (lines[row] ?? "").length;
  const leaf = nodeAtPosition(cached.tree.rootNode, row, column);
  if (!leaf) return null;

  const decl = nearestDeclaration(leaf);
  if (!decl) return null;
  const name = symbolName(decl);
  if (!name) return null;

  const info = graph.classGraph.get(name);
  if (!info) return null;

  const parents = info.parent ? [info.parent] : [];
  const children = Array.from(graph.classGraph.values())
    .filter((c) => c.parent === name)
    .map((c) => c.name);

  return {
    name: info.name,
    file: info.file,
    range: info.range,
    parents,
    children,
    interfaces: info.interfaces
  };
}