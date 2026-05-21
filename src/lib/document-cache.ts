import { listDocuments, downloadFile } from "./github";
import { parsePDF, TextChunk } from "./parsers/pdf";
import { parseExcel } from "./parsers/excel";

/**
 * In-memory document cache.
 * Documents are fetched from GitHub once, parsed, and cached.
 * Cache auto-refreshes every 5 minutes or when manually invalidated.
 */

interface DocumentCache {
  chunks: TextChunk[];
  lastFetched: number;
  fileHashes: string; // Concatenated SHAs to detect changes
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cache: DocumentCache | null = null;

/**
 * Get all document chunks, using cache when available.
 * Cache invalidates when:
 * 1. TTL expires (5 minutes)
 * 2. File list changes (new upload/delete detected via SHA comparison)
 */
export async function getCachedChunks(): Promise<TextChunk[]> {
  // Check if cache is still valid
  if (cache && Date.now() - cache.lastFetched < CACHE_TTL_MS) {
    // Quick check: has the file list changed?
    const files = await listDocuments();
    const currentHashes = files.map((f) => f.sha).sort().join(",");

    if (currentHashes === cache.fileHashes) {
      // No changes — return cached chunks
      return cache.chunks;
    }
    // Files changed — fall through to re-parse
  }

  // Fetch and parse all documents
  const files = await listDocuments();
  const allChunks: TextChunk[] = [];

  for (const file of files) {
    try {
      const buffer = await downloadFile(file.path);
      const ext = file.name.toLowerCase().split(".").pop();

      if (ext === "pdf") {
        const chunks = await parsePDF(buffer, file.name);
        allChunks.push(...chunks);
      } else if (ext === "csv" || ext === "xlsx" || ext === "xls") {
        const chunks = parseExcel(buffer, file.name);
        allChunks.push(...chunks);
      }
    } catch (err) {
      console.error(`Error parsing ${file.name}:`, err);
    }
  }

  // Update cache
  cache = {
    chunks: allChunks,
    lastFetched: Date.now(),
    fileHashes: files.map((f) => f.sha).sort().join(","),
  };

  console.log(
    `[Cache] Loaded ${allChunks.length} chunks from ${files.length} documents`
  );

  return allChunks;
}

/**
 * Force-invalidate the cache (called after admin upload/delete).
 */
export function invalidateCache(): void {
  cache = null;
  console.log("[Cache] Document cache invalidated");
}
