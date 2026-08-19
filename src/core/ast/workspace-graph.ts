/**
 * Vizier AST Engine — Workspace Graph
 *
 * Builds a workspace-wide symbol index, call graph, and class hierarchy
 * from the cached parse trees. Tools 2 (get_function_hierarchy),
 * 3 (get_class_hierarchy), and 5 (get_references) all query this.
 *
 * Resolution is name-based and structural (no interprocedural type
 * analysis): call sites are linked to candidate definitions by the
 * callee's last identifier segment. For single-file code and small
 * workspaces this is exact in practice; where a name is ambiguous we
 * return all candidates and let the caller decide.
 */

import Parser from "web-tree-sitter";
import {
  CachedTree,
  declarationKind,
  symbolName,
  nodeRange,
  nearestDeclaration,
  SimpleRange
} from "./parser-engine";

export interface SymbolRef {
  file: string;
  name: string;
  kind: string;
  range: SimpleRange;
}

export interface CallSite {
  file: string;
  callee: string; // last identifier segment, e.g. "find" from this.db.users.find
  calleeFull: string; // full expression text, e.g. "this.db.users.find"
  range: SimpleRange;
}

export interface ClassInfo {
  name: string;
  file: string;
  range: SimpleRange;
  parent: string | null;
  interfaces: string[];
}

export interface WorkspaceGraph {
  files: string[];
  /** key: `${file}::${name}` -> declaration */
  symbols: Map<string, SymbolRef>;
  /** caller symbol key -> callee names (direct edges) */
  callGraph: Map<string, string[]>;
  /** name -> declarations across the whole workspace (name can collide) */
  byName: Map<string, SymbolRef[]>;
  /** name -> class info */
  classGraph: Map<string, ClassInfo>;
}

const IDENTIFIER_TYPES = new Set([
  "identifier",
  "property_identifier",
  "type_identifier",
  "shorthand_property_identifier",
  "shorthand_property_identifier_pattern",
  "attribute"
]);

export function isIdentifierNode(node: Parser.SyntaxNode): boolean {
  return IDENTIFIER_TYPES.has(node.type);
}

/** Depth-first walk over every named descendant (including the root). */
export function walkNamed(node: Parser.SyntaxNode, fn: (n: Parser.SyntaxNode) => void): void {
  fn(node);
  for (const child of node.namedChildren) {
    walkNamed(child, fn);
  }
}

/** Extract the callee from a JS/TS call_expression or Python call node. */
export function calleeOf(node: Parser.SyntaxNode): { name: string; full: string } | null {
  const fn = node.childForFieldName("function");
  if (!fn) return null;

  const full = fn.text;
  if (fn.type === "member_expression") {
    const prop = fn.childForFieldName("property");
    return { name: prop ? prop.text : fn.text, full };
  }
  if (fn.type === "attribute") {
    const prop = fn.childForFieldName("attribute");
    return { name: prop ? prop.text : fn.text, full };
  }
  return { name: fn.text, full };
}

function symbolKey(file: string, name: string): string {
  return `${file}::${name}`;
}

export function buildWorkspaceGraph(files: Map<string, CachedTree>): WorkspaceGraph {
  const graph: WorkspaceGraph = {
    files: Array.from(files.keys()),
    symbols: new Map(),
    callGraph: new Map(),
    byName: new Map(),
    classGraph: new Map()
  };

  for (const [file, cached] of files) {
    walkNamed(cached.tree.rootNode, (node) => {
      const kind = declarationKind(node);
      const name = symbolName(node);

      if (kind && name) {
        const ref: SymbolRef = { file, name, kind, range: nodeRange(node) };
        const key = symbolKey(file, name);
        graph.symbols.set(key, ref);

        const byName = graph.byName.get(name) ?? [];
        byName.push(ref);
        graph.byName.set(name, byName);

        if (kind === "class") {
          const info = classInfoOf(node, file);
          if (info) graph.classGraph.set(name, info);
        }
      }

      if (node.type === "call_expression" || node.type === "call") {
        const callee = calleeOf(node);
        if (!callee) return;

        const enclosing = nearestDeclaration(node);
        if (!enclosing) return;
        const ownerName = symbolName(enclosing);
        if (!ownerName) return;

        const ownerKey = symbolKey(file, ownerName);
        const edges = graph.callGraph.get(ownerKey) ?? [];
        edges.push(callee.name);
        graph.callGraph.set(ownerKey, edges);
      }
    });
  }

  return graph;
}

function classInfoOf(node: Parser.SyntaxNode, file: string): ClassInfo | null {
  const name = symbolName(node);
  if (!name) return null;

  const info: ClassInfo = { name, file, range: nodeRange(node), parent: null, interfaces: [] };

  if (node.type === "class_declaration") {
    // class_heritage is a NAMED CHILD of class_declaration (not a field) in
    // the tree-sitter-wasms 0.1.13 grammar build.
    const heritage = node.namedChildren.find((c) => c.type === "class_heritage");
    if (heritage) {
      walkNamed(heritage, (n) => {
        if (n.type === "extends_clause") {
          info.parent = n.namedChildren.map((c) => c.text).join("");
        } else if (n.type === "implements_clause") {
          info.interfaces = n.namedChildren.map((c) => c.text);
        }
      });
    }
  } else if (node.type === "class_definition") {
    // Python: superclasses field holds the base class arguments.
    const superclasses = node.childForFieldName("superclasses");
    if (superclasses) {
      walkNamed(superclasses, (n) => {
        if (isIdentifierNode(n)) {
          if (!info.parent) info.parent = n.text;
          else info.interfaces.push(n.text);
        }
      });
    }
  }

  return info;
}

/** Find the declaration(s) for a symbol name across the workspace. */
export function findDeclarations(graph: WorkspaceGraph, name: string): SymbolRef[] {
  return graph.byName.get(name) ?? [];
}

/** Direct callee names for a symbol key. */
export function calleesOf(graph: WorkspaceGraph, symbolKeyName: string): string[] {
  return graph.callGraph.get(symbolKeyName) ?? [];
}

/** Symbols (keys) whose callee set includes the given name. */
export function callersOf(graph: WorkspaceGraph, name: string): string[] {
  const callers: string[] = [];
  for (const [key, edges] of graph.callGraph) {
    if (edges.includes(name)) callers.push(key);
  }
  return callers;
}

/** Breadth-first expansion of the call graph starting at a symbol key. */
export function expandCalls(
  graph: WorkspaceGraph,
  startKey: string,
  depth: number
): { key: string; ref: SymbolRef | undefined; callees: string[] }[] {
  const seen = new Set<string>([startKey]);
  const frontier = [startKey];
  const levels: { key: string; ref: SymbolRef | undefined; callees: string[] }[] = [];

  for (let level = 0; level < depth && frontier.length > 0; level++) {
    const next: string[] = [];
    for (const key of frontier) {
      const callees = calleesOf(graph, key);
      levels.push({ key, ref: graph.symbols.get(key), callees });
      for (const name of callees) {
        for (const decl of findDeclarations(graph, name)) {
          const dk = symbolKey(decl.file, decl.name);
          if (!seen.has(dk)) {
            seen.add(dk);
            next.push(dk);
          }
        }
      }
    }
    frontier.length = 0;
    frontier.push(...next);
  }

  return levels;
}