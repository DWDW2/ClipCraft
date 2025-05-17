// app/clips/page.tsx (Server Component)
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import DownloadButton from "./download-button";

interface Clip {
  name: string;
  displayName: string;
  url: string;
  createdAt: number;
}

async function getClips(): Promise<Clip[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/clips`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch clips: ${response.status}`);
    }

    const data = await response.json();
    return data.clips;
  } catch (error) {
    console.error("Error fetching clips:", error);
    return [];
  }
}

export default async function ClipsPage() {
  const clips = await getClips();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Video Clips</h1>
        <p className="text-sm text-muted-foreground">
          {clips.length} {clips.length === 1 ? "clip" : "clips"} created
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clip History</CardTitle>
          <CardDescription>
            View and download your created video clips
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {clips.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No clips created yet
              </div>
            ) : (
              <div className="space-y-4">
                {clips.map((clip) => (
                  <Card key={clip.name}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Video className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium truncate">
                              {clip.displayName}
                            </h3>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDistanceToNow(clip.createdAt, {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <video
                            src={clip.url}
                            controls
                            className="w-48 h-32 rounded-lg object-cover"
                          />
                          <DownloadButton
                            url={clip.url}
                            displayName={clip.displayName}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
