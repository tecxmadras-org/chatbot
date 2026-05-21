export interface TextChunk {
  text: string;
  source: string;
  chunkIndex: number;
}

/**
 * Parse a PDF buffer into text chunks.
 * Loads pdf-parse dynamically to avoid import-time crashes in serverless functions.
 */
export async function parsePDF(
  buffer: Buffer,
  filename: string
): Promise<TextChunk[]> {
  try {
    const { PDFParse, VerbosityLevel } = require("pdf-parse");
    const parser = new PDFParse({
      data: new Uint8Array(buffer),
      verbosity: VerbosityLevel.ERRORS,
    });
    const result = await parser.getText();
    const fullText = result.pages.map((p: any) => p.text).join("\n");
    return chunkText(fullText, filename);
  } catch (err) {
    console.error(`[PDF] Failed to parse ${filename}:`, err);
    return [];
  }
}

/**
 * Split text into ~500-token chunks with overlap
 * Approximately 4 characters per token
 */
function chunkText(
  text: string,
  source: string,
  chunkSize: number = 2000, // ~500 tokens
  overlap: number = 200 // ~50 tokens overlap
): TextChunk[] {
  const chunks: TextChunk[] = [];

  // Clean up whitespace
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (cleanText.length === 0) return chunks;

  let start = 0;
  let chunkIndex = 0;

  while (start < cleanText.length) {
    let end = start + chunkSize;

    // Try to break at a sentence boundary
    if (end < cleanText.length) {
      const slice = cleanText.slice(start, end + 100);
      const sentenceEnd = slice.lastIndexOf(". ");
      if (sentenceEnd > chunkSize * 0.5) {
        end = start + sentenceEnd + 1;
      }
    } else {
      end = cleanText.length;
    }

    const chunkText = cleanText.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        source,
        chunkIndex,
      });
      chunkIndex++;
    }

    start = end - overlap;
    if (start >= cleanText.length) break;
  }

  return chunks;
}
