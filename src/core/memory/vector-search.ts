/**
 * Vizier Memory Engine — Vector Search (pure JS)
 *
 * Stands in for sqlite-vec + an ONNX embedding model. Uses simple
 * term-frequency vectors and cosine similarity, which the original
 * architecture doc's own risk register calls out as the right fallback
 * for small-to-medium codebases ("Fall back to TF-IDF keyword search
 * when chunk count < 100" — this generalizes fine well past that).
 *
 * The interface (vectorize, cosineSimilarity, semanticSearch) is the
 * seam to swap in a real embedding model later without touching callers.
 */

import { getDb, run } from "./database";

export type TermVector = Record<string, number>;

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "and", "or", "in", "on", "for", "with", "this", "that",
  "it", "as", "at", "by", "from", "if", "then", "else", "return",
  "function", "const", "let", "var", "import", "export", "class"
]);

/** Tokenize source-ish text into lowercase word/identifier tokens. */
function tokenize(text: string): string[] {
  const raw = text
    .replace(/[_\-]/g, " ")
    // split camelCase / PascalCase boundaries
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .match(/[a-z][a-z0-9]{1,}/g) || [];

  return raw.filter((t) => !STOPWORDS.has(t) && t.length > 1);
}

/** Build a term-frequency vector for a piece of text. */
export function vectorize(text: string): TermVector {
  const tokens = tokenize(text);
  const vec: TermVector = {};
  for (const t of tokens) {
    vec[t] = (vec[t] || 0) + 1;
  }
  // log-normalize term frequency so long chunks don't dominate purely by length
  for (const t of Object.keys(vec)) {
    vec[t] = 1 + Math.log(vec[t]);
  }
  return vec;
}

export function vectorNorm(vec: TermVector): number {
  let sumSq = 0;
  for (const t of Object.keys(vec)) sumSq += vec[t] * vec[t];
  return Math.sqrt(sumSq);
}

export function cosineSimilarity(a: TermVector, b: TermVector, normA?: number, normB?: number): number {
  const na = normA ?? vectorNorm(a);
  const nb = normB ?? vectorNorm(b);
  if (na === 0 || nb === 0) return 0;

  // iterate the smaller vector for speed
  const [small, large] = Object.keys(a).length < Object.keys(b).length ? [a, b] : [b, a];
  let dot = 0;
  for (const term of Object.keys(small)) {
    if (term in large) dot += small[term] * large[term];
  }
  return dot / (na * nb);
}

/** Store (or replace) the vector for a chunk. Call after inserting a chunk row. */
export function storeChunkVector(chunkId: string, text: string): void {
  const vec = vectorize(text);
  const norm = vectorNorm(vec);
  run(
    `INSERT INTO chunk_vectors (chunk_id, vector_json, norm) VALUES (?, ?, ?)
     ON CONFLICT(chunk_id) DO UPDATE SET vector_json = excluded.vector_json, norm = excluded.norm`,
    [chunkId, JSON.stringify(vec), norm]
  );
}

export interface SemanticSearchResult {
  chunk_id: string;
  file_path: string;
  start_line: number;
  end_line: number;
  symbol_name: string | null;
  symbol_kind: string | null;
  content: string;
  score: number;
}

/**
 * Rank all semantic chunks by similarity to the query text.
 * Linear scan is fine at the chunk counts a single workspace realistically
 * produces; if that stops being true, this is the seam to swap in an ANN
 * index without changing the call site.
 */
export function semanticSearch(queryText: string, topK: number = 10): SemanticSearchResult[] {
  const db = getDb();
  const queryVec = vectorize(queryText);
  const queryNorm = vectorNorm(queryVec);

  const stmt = db.prepare(`
    SELECT c.id as chunk_id, c.file_path, c.start_line, c.end_line,
           c.symbol_name, c.symbol_kind, c.content,
           v.vector_json, v.norm
    FROM chunks c
    JOIN chunk_vectors v ON v.chunk_id = c.id
    WHERE c.layer = 'semantic'
  `);

  const scored: SemanticSearchResult[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as any;
    const vec: TermVector = JSON.parse(row.vector_json);
    const score = cosineSimilarity(queryVec, vec, queryNorm, row.norm);
    if (score > 0) {
      scored.push({
        chunk_id: row.chunk_id,
        file_path: row.file_path,
        start_line: row.start_line,
        end_line: row.end_line,
        symbol_name: row.symbol_name,
        symbol_kind: row.symbol_kind,
        content: row.content,
        score
      });
    }
  }
  stmt.free();

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
