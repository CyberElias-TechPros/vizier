/**
 * Smoke test for the Phase 2 AST engine (web-tree-sitter + tree-sitter-wasms).
 * Exercises parser-engine, get_file_structure, get_symbol_at_position,
 * replace_code_range (with seam validation), and validate_syntax.
 */

import { test } from "node:test";
import assert from "node:assert";
import * as path from "node:path";
import { initParserEngine, parseFile, parseSnippet } from "../../src/core/ast/parser-engine.ts";
import { getFileStructure } from "../../src/core/ast/get-file-structure.ts";
import { getSymbolAtPosition } from "../../src/core/ast/get-symbol-at-position.ts";
import { replaceCodeRange } from "../../src/core/ast/replace-code-range.ts";
import { validateSyntax } from "../../src/core/ast/validate-syntax.ts";
import { buildWorkspaceGraph } from "../../src/core/ast/workspace-graph.ts";
import { getFunctionHierarchy } from "../../src/core/ast/function-hierarchy.ts";
import { getClassHierarchy } from "../../src/core/ast/class-hierarchy.ts";
import { getReferences } from "../../src/core/ast/references.ts";
import { getDependencies } from "../../src/core/ast/dependencies.ts";
import { getTypeInfo } from "../../src/core/ast/type-info.ts";
import { renameSymbol } from "../../src/core/ast/rename.ts";
import { insertCodeBlock } from "../../src/core/ast/insert-code.ts";
import { extractSymbol } from "../../src/core/ast/extract-symbol.ts";

// Tests run from the repo root via tsx; grammars live in node_modules.
const GRAMMARS_DIR = path.join(__dirname, "..", "..", "node_modules", "tree-sitter-wasms", "out");

const SAMPLE_TS = `
export class UserRepository {
  async findById(id: string) {
    return this.db.users.find(id);
  }

  async createUser(email: string, password: string) {
    const hashed = await hashPassword(password);
    return this.db.users.insert({ email, hashed });
  }
}

function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}
`;

test("parser-engine: initializes, parses, caches, and bumps version on reparse", async () => {
  await initParserEngine(GRAMMARS_DIR);
  const cached = await parseFile("/repo/src/user-repo.ts", SAMPLE_TS);
  assert.ok(cached.tree.rootNode);
  assert.strictEqual(cached.language, "typescript");
  assert.strictEqual(cached.version, 1);

  const reparse = await parseFile("/repo/src/user-repo.ts", SAMPLE_TS);
  assert.strictEqual(reparse.version, 2, "reparse should bump the version (staleness detection)");
  assert.strictEqual(reparse.text, SAMPLE_TS);
});

test("get_file_structure: lists class + methods + top-level function with ranges", async () => {
  const cached = await parseFile("/repo/src/user-repo.ts", SAMPLE_TS);
  const structure = getFileStructure("/repo/src/user-repo.ts", cached);

  const classSymbol = structure.symbols.find((s) => s.kind === "class");
  assert.ok(classSymbol, "expected a class symbol");
  assert.strictEqual(classSymbol.name, "UserRepository");
  assert.deepStrictEqual(
    classSymbol.children.map((m) => m.name),
    ["findById", "createUser"]
  );
  assert.ok(classSymbol.children.every((m) => m.kind === "method"));

  const fn = structure.symbols.find((s) => s.kind === "function");
  assert.strictEqual(fn?.name, "hashPassword");
  assert.strictEqual(fn?.range.startLine, 13, "hashPassword starts on line 13 (1-indexed)");
  assert.strictEqual(fn?.range.endLine, 15);
});

test("get_symbol_at_position: finds enclosing declaration with brace-free signature", async () => {
  const cached = await parseFile("/repo/src/user-repo.ts", SAMPLE_TS);
  // createUser starts on 1-indexed line 7; column 10 is inside its name.
  const result = getSymbolAtPosition(cached, 7, 10);
  assert.strictEqual(result.found, true);
  assert.strictEqual(result.name, "createUser");
  assert.strictEqual(result.kind, "method");
  assert.ok(result.signature, "expected a signature");
  assert.ok(result.signature!.startsWith("async createUser(email: string, password: string)"), result.signature!);
  assert.ok(!result.signature!.includes("{"), "signature must not include the body brace");
});

test("replace_code_range: builds a valid edit and reports no seam errors", async () => {
  const cached = await parseFile("/repo/src/user-repo.ts", SAMPLE_TS);
  const result = await replaceCodeRange(
    "/repo/src/user-repo.ts",
    cached,
    13, 15,
    "function hashPassword(password: string) {\n  return bcrypt.hash(password, 12);\n}"
  );

  assert.deepStrictEqual(result.parseErrors, [], "valid replacement should have no parse errors");
  assert.strictEqual(result.edit.file, "/repo/src/user-repo.ts");
  assert.strictEqual(result.edit.range.startLine, 13);
  assert.strictEqual(result.edit.range.endLine, 15);
  assert.ok(result.edit.newText.includes("return bcrypt.hash(password, 12);"));

  // The produced edit must splice cleanly into the file and still parse.
  const lines = cached.text.split(/\r?\n/);
  const before = lines.slice(0, result.edit.range.startLine - 1);
  const after = lines.slice(result.edit.range.endLine);
  const spliced = [...before, result.edit.newText, ...after].join("\n");
  const tree = await parseSnippet(spliced, cached.language);
  const { valid } = validateSyntax(tree.rootNode);
  assert.strictEqual(valid, true, "spliced file should parse cleanly");
});

test("replace_code_range: catches a bad replacement at its seams", async () => {
  const cached = await parseFile("/repo/src/user-repo.ts", SAMPLE_TS);
  const result = await replaceCodeRange(
    "/repo/src/user-repo.ts",
    cached,
    13, 15,
    "function broken( {"
  );
  assert.ok(result.parseErrors.length > 0, "unclosed function should produce parse errors");
});

test("validate_syntax: reports errors for broken code, none for clean code", async () => {
  const bad = await parseSnippet("function foo( {\n", "typescript");
  const badResult = validateSyntax(bad.rootNode);
  assert.strictEqual(badResult.valid, false);
  assert.ok(badResult.errors.length > 0, "expected at least one syntax error");
  assert.ok(badResult.errors.every((e) => typeof e.line === "number" && typeof e.column === "number"));

  const good = await parseSnippet("function foo(x: number) { return x + 1; }\n", "typescript");
  const goodResult = validateSyntax(good.rootNode);
  assert.strictEqual(goodResult.valid, true);
  assert.deepStrictEqual(goodResult.errors, []);
});

// --- New samples for graph/hierarchy/refs/deps/type-info/rename tools ----

const SAMPLE_TS_WITH_CALLS = `
export class UserRepository {
  async findById(id: string) {
    return this.db.users.find(id);
  }

  async createUser(email: string, password: string) {
    const hashed = await hashPassword(password);
    return this.db.users.insert({ email, hashed });
  }
}

function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function registerUser() {
  const repo = new UserRepository();
  return repo.createUser("a@b.com", "pw");
}
`;

const SAMPLE_PAYMENT_TS = `
import { UserRepository } from "./user-repo";
import * as crypto from "crypto";

const total: number = 42;

export class PaymentProcessor {
  async chargeCard(userId: string, amountCents: number): Promise<void> {
    const user = await this.users.findById(userId);
    return this.stripe.charge(user.stripeCustomerId, amountCents);
  }
}
`;

const SAMPLE_SHAPES_TS = `
export interface Shape {
  area(): number;
}

export class BaseShape {
  color: string;
}

export class Circle extends BaseShape implements Shape {
  area(): number {
    return 3.14;
  }
}

export class RedCircle extends Circle {}
`;

test("workspace-graph: builds symbol index + call edges", async () => {
  const files = new Map<string, import("../../src/core/ast/parser-engine.ts").CachedTree>();
  files.set("/repo/src/user-repo.ts", await parseFile("/repo/src/user-repo.ts", SAMPLE_TS_WITH_CALLS));
  files.set("/repo/src/payment.ts", await parseFile("/repo/src/payment.ts", SAMPLE_PAYMENT_TS));

  const graph = buildWorkspaceGraph(files);

  assert.strictEqual(graph.symbols.get("/repo/src/user-repo.ts::UserRepository")?.kind, "class");
  assert.strictEqual(graph.symbols.get("/repo/src/user-repo.ts::hashPassword")?.kind, "function");

  // createUser calls hashPassword.
  const callees = graph.callGraph.get("/repo/src/user-repo.ts::createUser");
  assert.ok(callees && callees.includes("hashPassword"), "createUser should call hashPassword");
  // registerUser calls createUser (via repo.createUser).
  assert.ok(graph.callGraph.get("/repo/src/user-repo.ts::registerUser")?.includes("createUser"));
  // chargeCard calls findById (via this.users.findById).
  assert.ok(graph.callGraph.get("/repo/src/payment.ts::chargeCard")?.includes("findById"));
});

test("get_function_hierarchy: callees + callers resolved by name", async () => {
  const files = new Map<string, import("../../src/core/ast/parser-engine.ts").CachedTree>();
  files.set("/repo/src/user-repo.ts", await parseFile("/repo/src/user-repo.ts", SAMPLE_TS_WITH_CALLS));
  files.set("/repo/src/payment.ts", await parseFile("/repo/src/payment.ts", SAMPLE_PAYMENT_TS));
  const graph = buildWorkspaceGraph(files);
  const cached = files.get("/repo/src/user-repo.ts")!;

  const h = getFunctionHierarchy("/repo/src/user-repo.ts", cached, graph, 7);
  assert.ok(h, "expected hierarchy for createUser (line 7)");
  assert.strictEqual(h.symbol.name, "createUser");
  assert.ok(h.callees.some((c) => c.name === "hashPassword"), "callees should include hashPassword");
  assert.ok(h.callers.some((c) => c.name === "registerUser"), "callers should include registerUser");
});

test("get_class_hierarchy: parents, children, interfaces", async () => {
  const files = new Map<string, import("../../src/core/ast/parser-engine.ts").CachedTree>();
  files.set("/repo/src/shapes.ts", await parseFile("/repo/src/shapes.ts", SAMPLE_SHAPES_TS));
  const graph = buildWorkspaceGraph(files);
  const cached = files.get("/repo/src/shapes.ts")!;

  const circle = getClassHierarchy("/repo/src/shapes.ts", cached, graph, 10);
  assert.ok(circle, "expected hierarchy for Circle (line 11)");
  assert.strictEqual(circle.name, "Circle");
  assert.deepStrictEqual(circle.parents, ["BaseShape"]);
  assert.deepStrictEqual(circle.interfaces, ["Shape"]);
  assert.deepStrictEqual(circle.children, ["RedCircle"]);
});

test("get_references: finds usages across files, excludes declaration by default", async () => {
  const files = new Map<string, import("../../src/core/ast/parser-engine.ts").CachedTree>();
  files.set("/repo/src/user-repo.ts", await parseFile("/repo/src/user-repo.ts", SAMPLE_TS_WITH_CALLS));
  const refs = getReferences("hashPassword", files);
  assert.ok(refs.occurrences >= 1, "hashPassword should have at least one reference");
  assert.ok(refs.references.every((r) => r.line !== 13), "declaration line 13 excluded by default");
  assert.ok(refs.references.some((r) => r.line === 8), "call site on line 8 should be found");
  assert.ok(refs.references.every((r) => r.context.length > 0), "each reference carries line context");
});

test("get_dependencies: ESM imports + symbols", async () => {
  const cached = await parseFile("/repo/src/payment.ts", SAMPLE_PAYMENT_TS);
  const deps = getDependencies("/repo/src/payment.ts", cached);
  assert.ok(deps.imports.length >= 2, "expected named import + namespace import");
  const named = deps.imports.find((i) => i.source === "./user-repo");
  assert.ok(named, "expected ./user-repo import");
  assert.deepStrictEqual(named!.symbols, ["UserRepository"]);
  const ns = deps.imports.find((i) => i.source === "crypto");
  assert.ok(ns && ns.symbols.includes("* as crypto"), "expected namespace import of crypto");
});

test("get_type_info: resolves TS annotations and literals", async () => {
  const cached = await parseFile("/repo/src/payment.ts", SAMPLE_PAYMENT_TS);
  // `const total: number = 42;` is line 5; column 6 is inside the name.
  const t = getTypeInfo("/repo/src/payment.ts", cached, 5, 6);
  assert.strictEqual(t.type, "number");
  assert.deepStrictEqual(t.spread, []);
});

test("rename_symbol: preview edits replace references, skip declaration name", async () => {
  const cached = await parseFile("/repo/src/user-repo.ts", SAMPLE_TS_WITH_CALLS);
  const result = renameSymbol("/repo/src/user-repo.ts", cached, 7, 5, "registerAccount");
  assert.strictEqual(result.symbolName, "createUser");
  assert.strictEqual(result.occurrences, 1, "one reference: repo.createUser on line 19");
  assert.strictEqual(result.edits[0].range.startLine, 19);
  assert.strictEqual(result.edits[0].newText, "registerAccount");
  assert.deepStrictEqual(result.affectedFiles, ["/repo/src/user-repo.ts"]);

  // The declaration name node itself must not be edited.
  assert.ok(!result.edits.some((e) => e.range.startLine === 7), "declaration line must not be edited");
});

test("insert_code_block: inserts after a line, seam validation passes", async () => {
  const cached = await parseFile("/repo/src/user-repo.ts", SAMPLE_TS_WITH_CALLS);
  const result = await insertCodeBlock(
    "/repo/src/user-repo.ts",
    cached,
    20,
    "export function logSignup(email: string) {\n  console.log(email);\n}"
  );
  assert.deepStrictEqual(result.parseErrors, []);
  assert.strictEqual(result.edit.range.startLine, 21, "insertion point is the line after afterLine=20");

  const lines = cached.text.split(/\r?\n/);
  const insertRow = 20;
  const spliced = [...lines.slice(0, insertRow), result.edit.newText.replace(/\n$/, ""), ...lines.slice(insertRow)].join("\n");
  const tree = await parseSnippet(spliced, cached.language);
  const { valid } = validateSyntax(tree.rootNode);
  assert.strictEqual(valid, true, "file with inserted function should parse cleanly");
});

test("extract_symbol: returns call replacement + new-function insertion", async () => {
  const cached = await parseFile("/repo/src/user-repo.ts", SAMPLE_TS_WITH_CALLS);
  // registerUser body: lines 18-19.
  const result = await extractSymbol("/repo/src/user-repo.ts", cached, 18, 19, "makeRepo");

  assert.ok(result.parseErrors.length === 0, `unexpected parse errors: ${JSON.stringify(result.parseErrors)}`);
  assert.ok(result.edit.newText.trim().startsWith("makeRepo("), "range is replaced with a call");
  assert.strictEqual(result.edit.range.startLine, 18);

  // The new function must be inserted (usagesUpdated) so the refactor is complete.
  assert.strictEqual(result.usagesUpdated.length, 1);
  assert.ok(result.usagesUpdated[0].newText.includes("function makeRepo("), "new function inserted");
  assert.ok(result.params.length >= 1, "heuristic parameter discovery produced params");

  // Apply both edits to the text and confirm the file still parses.
  const lines = cached.text.split(/\r?\n/);
  let text = [...lines.slice(0, 17), result.edit.newText, ...lines.slice(19)].join("\n");
  const ins = result.usagesUpdated[0];
  const insLines = text.split(/\r?\n/);
  const insRow = ins.range.startLine - 1;
  text = [...insLines.slice(0, insRow), ins.newText.trimEnd(), ...insLines.slice(insRow)].join("\n");
  const tree = await parseSnippet(text, cached.language);
  const { valid } = validateSyntax(tree.rootNode);
  assert.strictEqual(valid, true, "refactored file should parse cleanly");
});