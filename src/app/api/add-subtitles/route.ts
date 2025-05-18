import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { readFile, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { videoUrl, subtitles, start, end } = await req.json();

    // Create temporary files
    const tempDir = tmpdir();
    const timestamp = Date.now();
    const inputVideoPath = join(process.cwd(), "public", videoUrl);
    const outputVideoPath = join(tempDir, `output-${timestamp}.mp4`);
    const srtPath = join(tempDir, `subtitles-${timestamp}.srt`);
    const assPath = join(tempDir, `subtitles-${timestamp}.ass`);

    // Write SRT file
    await writeFile(srtPath, subtitles);

    // Convert SRT to ASS format
    try {
      const convertCommand = `ffmpeg -y -i "${srtPath}" "${assPath}"`;
      const { stderr: convertStderr } = await execAsync(convertCommand);
      if (convertStderr.includes("Error")) {
        throw new Error(convertStderr);
      }
    } catch (convertError: any) {
      console.error("SRT to ASS conversion error:", convertError.message);
      return NextResponse.json(
        { error: `Subtitle conversion failed: ${convertError.message}` },
        { status: 500 }
      );
    }

    // Process video with FFmpeg using ASS subtitles
    const ffmpegCommand = [
      "ffmpeg",
      "-y",
      "-i",
      `"${inputVideoPath}"`,
      "-vf",
      `"ass='${assPath}'"`, // Use ASS filter instead of subtitles filter
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      `"${outputVideoPath}"`,
    ].join(" ");

    try {
      const { stderr } = await execAsync(ffmpegCommand);
      if (stderr.includes("Error")) {
        throw new Error(stderr);
      }
    } catch (execError: any) {
      console.error("FFmpeg error:", execError.message);
      return NextResponse.json(
        { error: `Video processing failed: ${execError.message}` },
        { status: 500 }
      );
    }

    // Read output
    const outputVideo = await readFile(outputVideoPath, { encoding: "base64" });

    // Cleanup
    await Promise.allSettled([
      unlink(outputVideoPath),
      unlink(srtPath),
      unlink(assPath),
    ]);

    return NextResponse.json({
      success: true,
      videoData: `data:video/mp4;base64,${outputVideo}`,
    });
  } catch (error: any) {
    console.error("System error:", error);
    return NextResponse.json(
      { error: `Processing failed: ${error.message}` },
      { status: 500 }
    );
  }
}

// Improved time formatting with milliseconds handling
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = (seconds % 60).toFixed(3); // Get milliseconds
  return (
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${secs.replace(".", ",").padStart(6, "0")}`
  );
}
