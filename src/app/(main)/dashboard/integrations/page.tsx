"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Clip {
  name: string;
  displayName: string;
  url: string;
  createdAt: number;
}

interface Session {
  accessToken?: string;
}

export default function IntegrationsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function fetchClips() {
      try {
        const response = await fetch("/api/clips");
        const data = await response.json();
        setClips(data.clips);
      } catch (error) {
        console.error("Error fetching clips:", error);
        toast({
          title: "Error",
          description: "Failed to load clips",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchClips();
  }, [toast]);

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold">API Integrations</h1>
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access API integrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => signIn("google")}>
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const accessToken = (session as Session)?.accessToken;

  async function handleClipSelection(clip: Clip) {
    try {
      const response = await fetch(clip.url);
      const blob = await response.blob();
      const file = new File([blob], clip.name, { type: "video/mp4" });
      setVideoFile(file);
      setTitle(clip.displayName);
    } catch (error) {
      console.error("Error loading video:", error);
      toast({
        title: "Error",
        description: "Failed to load video file",
        variant: "destructive",
      });
    }
  }

  // Upload video to YouTube
  async function uploadVideo() {
    if (!videoFile) {
      toast({
        title: "No video selected",
        description: "Please select a video file to upload.",
        variant: "destructive",
      });
      return;
    }

    // Validate title
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({
        title: "Title required",
        description: "Please enter a valid title for your video.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedTitle.length > 100) {
      toast({
        title: "Title too long",
        description: "YouTube titles must be 100 characters or less.",
        variant: "destructive",
      });
      return;
    }

    if (!accessToken) {
      toast({
        title: "Access token missing",
        description: "You need to sign in with Google to upload videos.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);

    try {
      const metadata = {
        snippet: {
          title: title.trim(),
          description: description.trim(),
          categoryId: "22", // People & Blogs category
          tags: ["#shorts", "#youtubeshorts"], // Add shorts tags
        },
        status: {
          privacyStatus: "private",
          selfDeclaredMadeForKids: false,
        },
        contentDetails: {
          duration: "PT60S", // Set duration to 60 seconds (typical for shorts)
        },
        // Add shorts specific metadata
        shorts: {
          isShorts: true,
        },
      };

      // Create a multipart request body for YouTube API
      const boundary = "-------314159265358979323846";
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const reader = new FileReader();

      reader.onload = async (event) => {
        const base64Data = event.target?.result;

        if (!base64Data || typeof base64Data !== "string") {
          throw new Error("Failed to read video file");
        }

        const contentType = videoFile.type || "video/mp4";

        const body =
          delimiter +
          "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${contentType}\r\n` +
          "Content-Transfer-Encoding: base64\r\n" +
          "\r\n" +
          base64Data.split(",")[1] +
          closeDelimiter;

        const response = await fetch(
          "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status,contentDetails",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": `multipart/related; boundary=${boundary}`,
            },
            body,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Failed to upload video");
        }

        toast({
          title: "Upload successful",
          description: "Your video has been uploaded to YouTube Shorts.",
          variant: "default",
        });

        // Reset form
        setVideoFile(null);
        setTitle("");
        setDescription("");
      };

      reader.readAsDataURL(videoFile);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">API Integrations</h1>
        <Button variant="outline" onClick={() => signOut()}>
          Sign Out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* <Card>
          <CardHeader>
            <CardTitle>Instagram API</CardTitle>
            <CardDescription>
              Connect your Instagram account to enable direct posting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled>Connect Instagram</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>TikTok API</CardTitle>
            <CardDescription>
              Connect your TikTok account to enable direct posting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled>Connect TikTok</Button>
          </CardContent>
        </Card> */}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Available Clips</CardTitle>
            <CardDescription>
              Select a clip to upload to YouTube
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] rounded-md border p-4">
              <div className="space-y-4">
                {clips.map((clip) => (
                  <div
                    key={clip.name}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{clip.displayName}</h3>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(clip.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => handleClipSelection(clip)}
                    >
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>YouTube Shorts Upload</CardTitle>
            <CardDescription>
              Upload videos directly to your YouTube Shorts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block font-medium mb-1" htmlFor="title">
                Short Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter short title"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block font-medium mb-1" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Enter short description"
                rows={3}
              />
            </div>

            <div>
              <label className="block font-medium mb-1" htmlFor="video">
                Selected Video
              </label>
              {videoFile ? (
                <p className="text-sm text-gray-600">
                  Selected file: {videoFile.name}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  No video selected. Please select a clip from the list above.
                </p>
              )}
            </div>

            <Button onClick={uploadVideo} disabled={uploading || !videoFile}>
              {uploading ? "Uploading..." : "Upload to YouTube Shorts"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
