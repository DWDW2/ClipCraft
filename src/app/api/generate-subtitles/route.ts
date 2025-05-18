import { NextResponse } from "next/server";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
  Type,
} from "@google/genai";
import { exec } from "child_process";
import { promisify } from "util";
import { access, readFile, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const execAsync = promisify(exec);

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
});

interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

async function generateSubtitles(
  videoPath: string
): Promise<SubtitleSegment[]> {
  try {
    // Upload video to Gemini
    let uploadedFile = await genAI.files.upload({
      file: videoPath,
      config: { mimeType: "video/mp4" },
    });

    if (!uploadedFile.uri || !uploadedFile.mimeType || !uploadedFile.name) {
      throw new Error("Failed to upload video to Gemini");
    }

    // Wait for file to be processed
    while (!uploadedFile.state || uploadedFile.state.toString() !== "ACTIVE") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      uploadedFile = await genAI.files.get({ name: uploadedFile.name! });
    }

    // Generate subtitles using Gemini
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: createUserContent([
        createPartFromUri(uploadedFile.uri!, uploadedFile.mimeType!),
        'Analyze this video and generate subtitles. Return a JSON array of objects with \'start\' and \'end\' timecodes (in seconds) and the \'text\' for each subtitle segment. Keep subtitles concise and natural, 2-4 seconds per segment. RETURN ONLY JSON, NO OTHER TEXT. Format: [{"start": 0, "end": 3, "text": "Subtitle text"}]',
      ]),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: {
                type: Type.NUMBER,
                description: "Start time in seconds",
              },
              end: {
                type: Type.NUMBER,
                description: "End time in seconds",
              },
              text: {
                type: Type.STRING,
                description: "Subtitle text",
              },
            },
            required: ["start", "end", "text"],
          },
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response received from Gemini");
    }

    try {
      const segments = JSON.parse(responseText);
      return segments;
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      throw new Error("Failed to parse subtitle generation response");
    }
  } catch (error) {
    console.error("Error generating subtitles:", error);
    throw error;
  }
}

function createSRTContent(segments: SubtitleSegment[]): string {
  return segments
    .map((segment, index) => {
      return `${index + 1}\n${formatTime(segment.start)} --> ${formatTime(
        segment.end
      )}\n${segment.text}\n`;
    })
    .join("\n");
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = (seconds % 60).toFixed(3);
  return (
    `${String(hours).padStart(2, "0")}:` +
    `${String(minutes).padStart(2, "0")}:` +
    `${secs.replace(".", ",").padStart(6, "0")}`
  );
}

export async function POST(req: Request) {
  try {
    const { videoUrl } = await req.json();

    // Validate input file
    const inputVideoPath = join(process.cwd(), "public", videoUrl);
    try {
      await access(inputVideoPath);
    } catch {
      return NextResponse.json(
        { error: "Input video not found" },
        { status: 400 }
      );
    }

    // Generate subtitles
    const segments = await generateSubtitles(inputVideoPath);
    const srtContent = createSRTContent(segments);

    // Create temporary files
    const tempDir = tmpdir();
    const timestamp = Date.now();
    const outputVideoPath = join(tempDir, `output-${timestamp}.mp4`);
    const subtitlesPath = join(tempDir, `subtitles-${timestamp}.srt`);

    // Write subtitles to file
    await writeFile(subtitlesPath, srtContent);

    // Process video with FFmpeg
    const ffmpegCommand = [
      "ffmpeg",
      "-y",
      "-i",
      `"${inputVideoPath}"`,
      "-vf",
      `"subtitles='${subtitlesPath}':force_style='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=1'"`,
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
    await Promise.allSettled([unlink(outputVideoPath), unlink(subtitlesPath)]);

    return NextResponse.json({
      success: true,
      videoData: `data:video/mp4;base64,${outputVideo}`,
      subtitles: srtContent,
    });
  } catch (error: any) {
    console.error("System error:", error);
    return NextResponse.json(
      { error: `Processing failed: ${error.message}` },
      { status: 500 }
    );
  }
}
