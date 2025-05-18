import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
  Type,
} from "@google/genai";
import { NextResponse } from "next/server";
import { join } from "path";
import { existsSync } from "fs";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const { fileUrl, prompt } = await req.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: "No file URL provided" },
        { status: 400 }
      );
    }

    const videoPath = join(process.cwd(), "public", fileUrl);

    if (!existsSync(videoPath)) {
      console.error(`Video file not found at path: ${videoPath}`);
      return NextResponse.json(
        { error: "Video file not found" },
        { status: 404 }
      );
    }

    console.log("Uploading video to Gemini...");
    let uploadedFile = await genAI.files.upload({
      file: videoPath,
      config: { mimeType: "video/mp4" },
    });

    if (!uploadedFile.uri || !uploadedFile.mimeType || !uploadedFile.name) {
      console.error("Failed to upload video to Gemini:", uploadedFile);
      return NextResponse.json(
        { error: "Failed to upload video to Gemini" },
        { status: 500 }
      );
    }

    console.log("Processing video...");
    let retryCount = 0;
    const maxRetries = 30; // 30 seconds timeout

    while (!uploadedFile.state || uploadedFile.state.toString() !== "ACTIVE") {
      console.log("File state:", uploadedFile.state);
      await sleep(1000);
      uploadedFile = await genAI.files.get({ name: uploadedFile.name! });
    }
    console.log("Video processing complete. State:", uploadedFile.state);

    console.log("Generating timecodes...");
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: createUserContent([
        createPartFromUri(uploadedFile.uri!, uploadedFile.mimeType!),
        prompt ||
          'Analyze this video and identify interesting moments. Return a JSON array of objects with \'start\' and \'end\' timecodes (in MM:SS format) and a brief \'description\' of each moment. Keep descriptions concise and engaging. RETURN ONLY JSON, NO OTHER TEXT. Format: [{"start": "00:00", "end": "00:10", "description": "Description of the moment"}]',
      ]),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              start: {
                type: Type.STRING,
                description: "Start time in MM:SS format",
              },
              end: {
                type: Type.STRING,
                description: "End time in MM:SS format",
              },
              description: {
                type: Type.STRING,
                description: "Description of the moment",
              },
            },
            required: ["start", "end", "description"],
          },
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      console.error("No response received from Gemini");
      return NextResponse.json(
        { error: "No response received from Gemini" },
        { status: 500 }
      );
    }

    console.log("Raw response:", responseText);
    let timecodes = [];
    try {
      const parsedResponse = JSON.parse(responseText);
      if (!Array.isArray(parsedResponse)) {
        throw new Error("Response is not an array");
      }
      timecodes = parsedResponse;
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      return NextResponse.json(
        { error: "Failed to parse video analysis" },
        { status: 500 }
      );
    }

    console.log("Successfully generated timecodes:", timecodes);
    return NextResponse.json({ timecodes });
  } catch (error) {
    console.error("Error processing video:", error);
    return NextResponse.json(
      {
        error: "Failed to process video",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
