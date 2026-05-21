import { NextRequest, NextResponse } from "next/server";
import { listDocuments } from "@/lib/github";

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const files = await listDocuments();
    return NextResponse.json({
      files: files.map((f) => ({
        name: f.name,
        size: f.size,
        sha: f.sha,
      })),
    });
  } catch (error: any) {
    console.error("List error:", error);
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 }
    );
  }
}
