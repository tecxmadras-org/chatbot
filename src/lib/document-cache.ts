import { listDocuments, downloadFile, uploadFile } from "./github";
import { parsePDF, TextChunk } from "./parsers/pdf";
import { parseExcel } from "./parsers/excel";

/**
 * Persisted RAG Index Cache using parsed-chunks.json on GitHub.
 * This avoids fetching and parsing PDFs/CSVs on every cold start in Vercel,
 * which takes more than 10 seconds and causes a 500 timeout.
 */

interface DocumentCache {
  chunks: TextChunk[];
  lastFetched: number;
  fileHashes: string; // Concatenated SHAs to detect changes
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in-memory TTL
const CHUNKS_FILE_NAME = "parsed-chunks.json";

let cache: DocumentCache | null = null;

/**
 * Get all document chunks, using local memory or parsed-chunks.json from GitHub.
 */
export async function getCachedChunks(): Promise<TextChunk[]> {
  const allFiles = await listDocuments();
  const docFiles = allFiles.filter((f) => f.name !== CHUNKS_FILE_NAME);
  const chunksFile = allFiles.find((f) => f.name === CHUNKS_FILE_NAME);

  // Generate current hashes of all source documents
  const currentHashes = docFiles.map((f) => f.sha).sort().join(",");

  // 1. If in-memory cache is valid and matches current hashes, return it
  if (cache && Date.now() - cache.lastFetched < CACHE_TTL_MS) {
    if (currentHashes === cache.fileHashes) {
      return cache.chunks;
    }
  }

  // 2. If parsed-chunks.json exists on GitHub, check if it's up to date
  if (chunksFile) {
    try {
      console.log("[Cache] Found parsed-chunks.json on GitHub, downloading...");
      const buffer = await downloadFile(chunksFile.path);
      const parsedData = JSON.parse(buffer.toString("utf-8"));

      if (parsedData.fileHashes === currentHashes && Array.isArray(parsedData.chunks)) {
        console.log("[Cache] parsed-chunks.json is up to date. Using it.");
        cache = {
          chunks: parsedData.chunks,
          lastFetched: Date.now(),
          fileHashes: currentHashes,
        };
        return parsedData.chunks;
      }
      console.log("[Cache] parsed-chunks.json is outdated. Rebuilding...");
    } catch (err) {
      console.error("[Cache] Failed to load/parse parsed-chunks.json:", err);
    }
  } else {
    console.log("[Cache] No parsed-chunks.json found on GitHub. Building index...");
  }

  // 3. Fallback: Parse all documents manually (only happens if outdated or missing)
  const allChunks: TextChunk[] = [];

  for (const file of docFiles) {
    try {
      console.log(`[Cache] Parsing ${file.name}...`);
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
      console.error(`[Cache] Error parsing ${file.name}:`, err);
    }
  }

  // 4. Update the in-memory cache
  cache = {
    chunks: allChunks,
    lastFetched: Date.now(),
    fileHashes: currentHashes,
  };

  // 5. Asynchronously upload the newly built index back to GitHub to keep it fresh
  // We do not await this to return the response as fast as possible to the user
  const newIndexData = {
    fileHashes: currentHashes,
    chunks: allChunks,
  };
  
  uploadFile(CHUNKS_FILE_NAME, Buffer.from(JSON.stringify(newIndexData), "utf-8"))
    .then(() => console.log("[Cache] Successfully saved updated index to GitHub."))
    .catch((err) => console.error("[Cache] Failed to save updated index to GitHub:", err));

  return allChunks;
}

/**
 * Force-invalidate the cache (called after admin upload/delete).
 */
export function invalidateCache(): void {
  cache = null;
  console.log("[Cache] Document cache invalidated");
}
