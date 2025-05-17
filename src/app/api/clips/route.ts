import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface Clip {
  name: string;
  displayName: string;
  url: string;
  createdAt: number;
}

export async function GET() {
  try {
    const clipsDir = path.join(process.cwd(), "public", "clips");

    if (!fs.existsSync(clipsDir)) {
      return NextResponse.json({ clips: [] });
    }

    const files = fs.readdirSync(clipsDir);

    const clips: Clip[] = files
      .filter((file) => file.endsWith(".mp4"))
      .map((file) => {
        const stats = fs.statSync(path.join(clipsDir, file));
        const displayName = file
          .replace("clip-", "")
          .replace(".mp4", "")
          .split("-")
          .map((word, index) =>
            index === 0
              ? word.charAt(0).toUpperCase() + word.slice(1)
              : word.toLowerCase()
          )
          .join(" ");

        return {
          name: file,
          displayName,
          url: `/clips/${file}`,
          createdAt: stats.birthtimeMs,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({ clips });
  } catch (error) {
    console.error("Error getting clips:", error);
    return NextResponse.json({ error: "Failed to get clips" }, { status: 500 });
  }
}
