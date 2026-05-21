export interface TextChunk {
  text: string;
  source: string;
  chunkIndex: number;
}

/**
 * Parse Excel (.xlsx) or CSV (.csv) buffer into text chunks.
 * Uses dynamic require to avoid import-time crashes on Vercel serverless.
 */
export function parseExcel(buffer: Buffer, filename: string): TextChunk[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

    if (jsonData.length === 0) continue;

    // Get column headers
    const headers = Object.keys(jsonData[0]);

    // Group rows into chunks of 5 for better context
    const rowGroupSize = 5;
    for (let i = 0; i < jsonData.length; i += rowGroupSize) {
      const rowGroup = jsonData.slice(i, i + rowGroupSize);
      const lines = rowGroup.map((row) => {
        return headers
          .map((h) => {
            const val = row[h];
            if (val === undefined || val === null || val === "") return null;
            return `${h}: ${val}`;
          })
          .filter(Boolean)
          .join(", ");
      });

      const sheetLabel =
        workbook.SheetNames.length > 1 ? ` (Sheet: ${sheetName})` : "";
      const text = lines.join("\n");

      if (text.trim().length > 0) {
        chunks.push({
          text: `[Source: ${filename}${sheetLabel}]\n${text}`,
          source: filename,
          chunkIndex,
        });
        chunkIndex++;
      }
    }
  }

  return chunks;
}

/**
 * Parse CSV content (also uses XLSX under the hood)
 */
export function parseCSV(buffer: Buffer, filename: string): TextChunk[] {
  return parseExcel(buffer, filename);
}
