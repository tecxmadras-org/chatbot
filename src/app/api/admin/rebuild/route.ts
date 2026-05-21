import { NextRequest, NextResponse } from "next/server";
import { listDocuments, downloadFile, uploadFile } from "@/lib/github";
import { parsePDF, TextChunk } from "@/lib/parsers/pdf";
import { parseExcel } from "@/lib/parsers/excel";

export const maxDuration = 60; // Allow up to 60 seconds

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === process.env.ADMIN_PASSWORD;
}

/**
 * Temporary route to rebuild the persistent chunks index locally
 * and upload it to GitHub, bypassing Vercel serverless timeouts.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    console.log("[Rebuild] Fetching document list from GitHub...");
    const allFiles = await listDocuments();
    const docFiles = allFiles.filter((f) => f.name !== "parsed-chunks.json");
    
    // Sort and generate file hash key
    const currentHashes = docFiles.map((f) => f.sha).sort().join(",");

    console.log(`[Rebuild] Found ${docFiles.length} files to parse.`);
    const allChunks: TextChunk[] = [];

    for (const file of docFiles) {
      console.log(`[Rebuild] Downloading and parsing: ${file.name}`);
      const buffer = await downloadFile(file.path);
      const ext = file.name.toLowerCase().split(".").pop();

      if (ext === "pdf") {
        const chunks = await parsePDF(buffer, file.name);
        allChunks.push(...chunks);
      } else if (ext === "csv" || ext === "xlsx" || ext === "xls") {
        const chunks = parseExcel(buffer, file.name);
        allChunks.push(...chunks);
      }
    }

    const indexData = {
      fileHashes: currentHashes,
      chunks: allChunks,
    };

    console.log("[Rebuild] Uploading parsed-chunks.json to GitHub...");
    await uploadFile("parsed-chunks.json", Buffer.from(JSON.stringify(indexData), "utf-8"));
    console.log("[Rebuild] Rebuild complete!");

    return NextResponse.json({
      success: true,
      message: `Successfully rebuilt RAG index with ${allChunks.length} chunks from ${docFiles.length} documents.`,
      hash: currentHashes,
    });
  } catch (error: any) {
    console.error("[Rebuild] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
