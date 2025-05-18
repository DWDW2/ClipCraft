import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || "",
});

export async function POST(request: Request) {
  try {
    const { description } = await request.json();

    if (!description) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const prompt = `Generate 5-7 relevant hashtags based on this description: "${description}". 
    The hashtags should be:
    1. Relevant to the content
    2. at most 5 tags
    Return only the hashtags as a JSON array, without any additional text.`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "A hashtag for the content",
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

    let hashtags: string[];
    try {
      hashtags = JSON.parse(responseText);
    } catch {
      // If parsing fails, extract hashtags from the text
      hashtags = responseText
        .split(/[\n,]/)
        .map((tag) => tag.trim())
        .filter((tag) => tag.startsWith("#"));
    }

    // Limit to 7 hashtags
    hashtags = hashtags.slice(0, 7);

    return NextResponse.json({ hashtags });
  } catch (error) {
    console.error("Error generating hashtags:", error);
    return NextResponse.json(
      { error: "Failed to generate hashtags" },
      { status: 500 }
    );
  }
}
