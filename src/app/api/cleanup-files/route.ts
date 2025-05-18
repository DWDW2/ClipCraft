import { NextResponse } from "next/server";
import { unlink } from "fs/promises";

export async function POST(req: Request) {
  try {
    const { filePaths } = await req.json();

    // Delete all files
    await Promise.all(
      Object.values(filePaths).map((path) => unlink(path as string))
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cleaning up files:", error);
    return NextResponse.json(
      { error: "Failed to clean up files" },
      { status: 500 }
    );
  }
}
