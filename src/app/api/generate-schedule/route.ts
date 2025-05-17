import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
});

interface Timecode {
  start: string;
  end: string;
  description: string;
  hashtags?: string[];
}

export async function POST(request: Request) {
  try {
    const { timecodes } = await request.json();

    if (!timecodes || !Array.isArray(timecodes)) {
      return NextResponse.json(
        { error: "Timecodes array is required" },
        { status: 400 }
      );
    }

    const prompt = `Given these video clips with their descriptions, create an optimal content schedule for the next 7 days. 
    Consider:
    1. Best posting times for tech/development content
    2. Content variety and flow
    3. Audience engagement patterns
    
    Clips to schedule:
    ${JSON.stringify(timecodes, null, 2)}
    
    Return a JSON array of objects with:
    - date: "YYYY-MM-DD"
    - clips: array of clip indices to post on that date
    - postingTime: "HH:MM" in 24-hour format
    - reason: brief explanation for the scheduling choice`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-04-17",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              date: {
                type: "STRING",
                description: "Date in YYYY-MM-DD format",
              },
              clips: {
                type: "ARRAY",
                items: {
                  type: "NUMBER",
                  description: "Index of the clip to post",
                },
              },
              postingTime: {
                type: "STRING",
                description: "Posting time in HH:MM 24-hour format",
              },
              reason: {
                type: "STRING",
                description: "Explanation for the scheduling choice",
              },
            },
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

    let schedule;
    try {
      schedule = JSON.parse(responseText);
    } catch (error) {
      console.error("Error parsing schedule:", error);
      return NextResponse.json(
        { error: "Failed to parse schedule" },
        { status: 500 }
      );
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Error generating schedule:", error);
    return NextResponse.json(
      { error: "Failed to generate schedule" },
      { status: 500 }
    );
  }
}
