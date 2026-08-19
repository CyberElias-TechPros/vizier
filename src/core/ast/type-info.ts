/**
 * Vizier AST Engine — Tool 7: get_type_info
 *
 * Best-effort structural type inference (no language server / tsserver
 * involved). Resolves the declared or inferrable type of an expression
 * at a position from the syntax tree:
 *
 *   - TS annotations on variables, parameters, and return types
 *   - literals (string/number/boolean/null/undefined)
 *   - arrays and object literals (with a property "spread")
 *   - call expressions (resolved to the callee's declared return type,
 *     when the callee is visible in the same file)
 *
 * This is deliberately NOT a full type checker — the doc's tool table asks
 * for a structured {type, spread} shape, which we produce. Swap in a real
 * checker behind this interface later if needed.
 */

import { CachedTree, nodeAtPosition, nearestDeclaration, symbolName, SimpleRange } from "./parser-engine";
import { walkNamed, WorkspaceGraph, findDeclarations } from "./workspace-graph";

export interface SpreadProperty {
  name: string;
  type: string;
}

export interface TypeInfoResult {
  type: string;
  spread: SpreadProperty[];
}

const JS_VALUE_TYPES: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  null: "null",
  undefined: "undefined"
};

const PY_VALUE_TYPES: Record<string, string> = {
  string: "string",
  int: "number",
  float: "number",
  bool: "boolean",
  None: "null"
};

function stripAnnotation(text: string): string {
  return text.trim().replace(/^:\s*/, "");
}

function inferValueType(node: any): string {
  switch (node.type) {
    case "string":
    case "string_fragment":
      return "string";
    case "number":
      return "number";
    case "true":
    case "false":
      return "boolean";
    case "null":
      return "null";
    case "undefined":
      return "undefined";
    case "array":
      return "Array";
    case "object":
    case "object_pattern":
      return "object";
    case "call_expression":
    case "call":
      return "unknown (call)";
    case "await_expression":
      return inferValueType(node.namedChildren[0] ?? node);
    default:
      return "unknown";
  }
}

function typeFromAnnotation(node: any): string | null {
  const ann = node.childForFieldName("type") ?? node.namedChildren.find((c: any) => c.type === "type_annotation");
  if (ann) {
    // The annotation node's text is like ": string" — strip the colon, and
    // drop TS's `type_annotation` wrapper to the inner type text.
    const text = stripAnnotation(ann.text);
    return text || null;
  }
  return null;
}

/** Infer type for a node, optionally resolving identifiers via the workspace. */
function inferType(node: any, cached: CachedTree, graph?: WorkspaceGraph): TypeInfoResult {
  const spread: SpreadProperty[] = [];

  if (node.type === "object" || node.type === "object_pattern" || node.type === "dictionary" || node.type === "set") {
    for (const child of node.namedChildren) {
      if (child.type === "pair" || child.type === "pair_pattern") {
        const key = child.childForFieldName("key");
        const val = child.childForFieldName("value");
        if (key) {
          spread.push({
            name: key.text,
            type: val ? inferType(val, cached, graph).type : "unknown"
          });
        }
      }
    }
    return { type: "object", spread };
  }

  if (node.type === "array" || node.type === "list" || node.type === "list_pattern" || node.type === "tuple") {
    const inner = node.namedChildren[0];
    return { type: `Array<${inner ? inferType(inner, cached, graph).type : "unknown"}>`, spread };
  }

  if (node.type === "variable_declarator" || node.type === "typed_parameter" || node.type === "required_parameter" || node.type === "optional_parameter") {
    const ann = typeFromAnnotation(node);
    if (ann) return { type: ann, spread };
    const value = node.childForFieldName("value") ?? node.namedChildren.find((c: any) => c.type === "value");
    if (value) return inferType(value, cached, graph);
    return { type: "unknown", spread };
  }

  if (node.type === "function_declaration" || node.type === "method_definition" || node.type === "function_definition" || node.type === "arrow_function" || node.type === "generator_function" || node.type === "function") {
    const ret = node.childForFieldName("return_type") ?? node.namedChildren.find((c: any) => c.type === "return_type");
    return { type: ret ? stripAnnotation(ret.text) : "unknown (function)", spread };
  }

  if (node.type === "identifier" || node.type === "property_identifier" || node.type === "type_identifier" || node.type === "attribute") {
    const value = resolveIdentifierType(node, cached, graph);
    if (value) return value;
    if (node.text in JS_VALUE_TYPES) return { type: JS_VALUE_TYPES[node.text], spread };
    if (node.text in PY_VALUE_TYPES) return { type: PY_VALUE_TYPES[node.text], spread };
    return { type: "unknown", spread };
  }

  if (node.type === "call_expression" || node.type === "call") {
    const fn = node.childForFieldName("function");
    if (fn && fn.type === "identifier") {
      const decl = graph ? findDeclarations(graph, fn.text) : [];
      if (decl.length > 0) {
        const d = decl[0];
        const other = graph ? graph.symbols.get(`${d.file}::${d.name}`) : undefined;
        if (other) return { type: `${other.kind} ${other.name}`, spread };
      }
    }
    return { type: "unknown (call)", spread };
  }

  return { type: "unknown", spread };
}

function resolveIdentifierType(node: any, cached: CachedTree, graph?: WorkspaceGraph): TypeInfoResult | null {
  // Search the same file for a declaration whose name field matches.
  let result: TypeInfoResult | null = null;
  walkNamed(cached.tree.rootNode, (n) => {
    if (result) return;
    const name = n.childForFieldName("name");
    if (name && name.text === node.text) {
      if (n.type === "variable_declarator" || n.type === "parameter" || n.type === "typed_parameter" || n.type === "function_definition" || n.type === "function_declaration" || n.type === "method_definition") {
        const ann = n.type.startsWith("function") || n.type === "method_definition"
          ? (n.childForFieldName("return_type") ?? null)
          : typeFromAnnotation(n);
        if (ann) {
          result = { type: typeof ann === "string" ? ann : stripAnnotation(ann.text), spread: [] };
          return;
        }
        const value = n.childForFieldName("value") ?? n.childForFieldName("body");
        if (value) {
          result = inferType(value, cached, graph);
          return;
        }
      }
    }
  });
  return result;
}

export function getTypeInfo(
  filePath: string,
  cached: CachedTree,
  line: number,
  column: number,
  graph?: WorkspaceGraph
): TypeInfoResult {
  const row = line - 1;
  const leaf = nodeAtPosition(cached.tree.rootNode, row, column);
  if (!leaf) return { type: "unknown", spread: [] };

  const result = inferType(leaf, cached, graph);
  return result;
}