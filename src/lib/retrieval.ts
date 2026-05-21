import { TextChunk } from "./parsers/pdf";

/**
 * BM25-based text retrieval engine.
 * No external services — runs entirely in memory.
 */

// BM25 parameters
const K1 = 1.5;
const B = 0.75;

interface TokenizedChunk {
  chunk: TextChunk;
  tokens: string[];
  length: number;
}

/**
 * Tokenize text: lowercase, remove punctuation, split by whitespace
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\./g, "") // so "b.tech" becomes "btech"
    .replace(/[^\w\s₹]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Calculate Inverse Document Frequency for a term
 */
function idf(term: string, docs: TokenizedChunk[]): number {
  const docsWithTerm = docs.filter((d) => d.tokens.includes(term)).length;
  if (docsWithTerm === 0) return 0;
  return Math.log((docs.length - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1);
}

/**
 * Calculate BM25 score for a single document against a query
 */
function bm25Score(
  queryTokens: string[],
  doc: TokenizedChunk,
  allDocs: TokenizedChunk[],
  avgDl: number
): number {
  let score = 0;

  for (const term of queryTokens) {
    const tf = doc.tokens.filter((t) => t === term).length;
    const idfScore = idf(term, allDocs);

    const numerator = tf * (K1 + 1);
    const denominator = tf + K1 * (1 - B + B * (doc.length / avgDl));

    score += idfScore * (numerator / denominator);
  }

  return score;
}

/**
 * Retrieve the top-K most relevant chunks for a query using BM25 scoring.
 */
export function retrieveRelevantChunks(
  query: string,
  chunks: TextChunk[],
  topK: number = 100
): TextChunk[] {
  if (chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return chunks.slice(0, topK);

  // Tokenize all chunks
  const tokenizedChunks: TokenizedChunk[] = chunks.map((chunk) => {
    const tokens = tokenize(chunk.text);
    return { chunk, tokens, length: tokens.length };
  });

  // Average document length
  const avgDl =
    tokenizedChunks.reduce((sum, d) => sum + d.length, 0) /
    tokenizedChunks.length;

  // Score each chunk
  const scored = tokenizedChunks.map((doc) => ({
    chunk: doc.chunk,
    score: bm25Score(queryTokens, doc, tokenizedChunks, avgDl),
  }));

  // Sort by score descending and return top K
  scored.sort((a, b) => b.score - a.score);

  // Filter out zero-score chunks
  const relevant = scored.filter((s) => s.score > 0);

  return relevant.slice(0, topK).map((s) => s.chunk);
}
