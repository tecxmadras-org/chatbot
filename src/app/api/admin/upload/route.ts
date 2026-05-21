import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/github";
import { invalidateCache } from "@/lib/document-cache";

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = file.name.toLowerCase().split(".").pop();
    const allowedExtensions = ["pdf", "csv", "xlsx", "xls"];
    if (!ext || !allowedExtensions.includes(ext)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed: ${allowedExtensions.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Max file size: 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be under 10MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(file.name, buffer);
    invalidateCache(); // Clear cache so new doc is picked up immediately

    return NextResponse.json({
      success: true,
      filename: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Please try again." },
      { status: 500 }
    );
  }
}
