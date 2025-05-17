import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execPromise = promisify(exec);

interface ClipRequest {
  videoUrl: string;
  start: number;
  end: number;
  description: string;
}

interface ClipResponse {
  status: "success" | "error";
  clipUrl?: string;
  message?: string;
}

export async function POST(
  request: Request
): Promise<NextResponse<ClipResponse>> {
  try {
    const { videoUrl, start, end, description }: ClipRequest =
      await request.json();

    // Extract the filename from the URL
    const urlObj = new URL(videoUrl, "http://localhost");
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();

    if (!filename) {
      throw new Error("Invalid video URL");
    }

    // Construct the source file path from the public/uploads directory
    const sourceFile = path.join(process.cwd(), "public", "uploads", filename);

    // Verify the file exists
    if (!fs.existsSync(sourceFile)) {
      console.error(`Looking for file at: ${sourceFile}`);
      throw new Error(`Source file not found: ${filename}`);
    }

    // Create a unique filename for the clip
    const clipName = `clip-${Date.now()}.mp4`;

    // Ensure the clips directory exists in the public folder for serving
    const clipsDir = path.join(process.cwd(), "public", "clips");
    if (!fs.existsSync(clipsDir)) {
      fs.mkdirSync(clipsDir, { recursive: true });
    }

    const outputFile = path.join(clipsDir, clipName);

    // Convert timecodes to the format ffmpeg expects (seconds)
    const duration = end - start;

    console.log(`Creating clip from ${sourceFile}`);
    console.log(`Time range: ${start}s to ${end}s (duration: ${duration}s)`);

    // Execute ffmpeg command to create the clip
    const { stdout, stderr } = await execPromise(
      `ffmpeg -i "${sourceFile}" -ss ${start} -t ${duration} -c:v copy -c:a copy "${outputFile}"`
    );

    if (stderr) {
      console.log("FFmpeg output:", stderr);
    }

    // Return the URL to the created clip (accessible from public directory)
    const clipUrl = `/clips/${clipName}`;

    return NextResponse.json({
      status: "success",
      clipUrl,
    });
  } catch (error: unknown) {
    console.error("Error creating clip:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
