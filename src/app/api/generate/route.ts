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
      return NextResponse.json(
        { error: "Video file not found" },
        { status: 404 }
      );
    }

    let uploadedFile = await genAI.files.upload({
      file: videoPath,
      config: { mimeType: "video/mp4" },
    });

    if (!uploadedFile.uri || !uploadedFile.mimeType || !uploadedFile.name) {
      return NextResponse.json(
        { error: "Failed to upload video to Gemini" },
        { status: 500 }
      );
    }

    console.log("Processing video...");
    while (!uploadedFile.state || uploadedFile.state.toString() !== "ACTIVE") {
      console.log("File state:", uploadedFile.state);
      await sleep(1000);
      uploadedFile = await genAI.files.get({ name: uploadedFile.name! });
    }
    console.log("Video processing complete. State:", uploadedFile.state);

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: createUserContent([
        createPartFromUri(uploadedFile.uri!, uploadedFile.mimeType!),
        prompt ||
          'Analyze audio of the video and identify interesting moments. Return a JSON array of objects with \'start\' and \'end\' timecodes (in seconds) and a brief \'description\' of each moment. RETURN ONLY JSON, NO OTHER TEXT. ANALYZE AUDIO AS WELL. IN THE FOLLOWING FORMAT: [{"start": 00:00, "end": 00:10, "description": "Description of the moment"}, {"start": 10:30, "end": 20:10, "description": "Description of the moment"}] where start and end are in the format of MM:SS',
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
                description: "Start time in MM:SS",
              },
              end: {
                type: Type.STRING,
                description: "End time in MM:SS",
              },
              description: {
                type: Type.STRING,
                description:
                  "Description of the moment and why it is interesting",
              },
            },
            required: ["start", "end", "description"],
            propertyOrdering: ["start", "end", "description"],
          },
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return NextResponse.json(
        { error: "No response received from Gemini" },
        { status: 500 }
      );
    }

    console.log("Response:", responseText);
    let timecodes = [];
    try {
      const parsedResponse = JSON.parse(responseText);
      timecodes = parsedResponse || [];
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      return NextResponse.json(
        { error: "Failed to parse video analysis" },
        { status: 500 }
      );
    }

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
