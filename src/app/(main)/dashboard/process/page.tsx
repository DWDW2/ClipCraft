"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, Upload, Scissors } from "lucide-react";

interface Timecode {
  start: string;
  end: string;
  description: string;
}

export default function ProcessVideoPage() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [timecodes, setTimecodes] = useState<Timecode[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClipping, setIsClipping] = useState<number | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        return prev + 5;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();
      setVideoUrl(data.url);
      toast({
        title: "Success",
        description: "Video uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload video",
        variant: "destructive",
      });
    } finally {
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => setIsUploading(false), 400);
    }
  };

  const handleAnalyze = async () => {
    if (!videoUrl) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileUrl: videoUrl,
          prompt:
            "Analyze this video and identify interesting moments. Return JSON with timecodes.",
        }),
      });

      if (!response.ok) throw new Error("Analysis failed");

      const data = await response.json();
      setTimecodes(data.timecodes);
      toast({
        title: "Success",
        description: "Video analysis complete",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze video",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const convertTimeToSeconds = (timeStr: string): number => {
    const [minutes, seconds] = timeStr.split(":").map(Number);
    return minutes * 60 + seconds;
  };

  const handleCreateClip = async (timecode: Timecode, index: number) => {
    if (!videoUrl) return;

    setIsClipping(index);
    try {
      const response = await fetch("/api/create-clip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl,
          start: convertTimeToSeconds(timecode.start),
          end: convertTimeToSeconds(timecode.end),
          description: timecode.description,
        }),
      });

      if (!response.ok) throw new Error("Clip creation failed");

      const data = await response.json();

      toast({
        title: "Success",
        description: "Clip created successfully",
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(data.clipUrl, "_blank")}
          >
            View Clip
          </Button>
        ),
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create clip",
        variant: "destructive",
      });
    } finally {
      setIsClipping(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Process Video</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload Video</CardTitle>
            <CardDescription>
              Upload a video to analyze and create clips
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
                id="video-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="video-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {isUploading ? "Uploading..." : "Click to upload video"}
                </span>
              </label>
            </div>

            {isUploading && (
              <Progress value={uploadProgress} className="w-full" />
            )}

            {videoUrl && (
              <div className="space-y-4">
                <video src={videoUrl} controls className="w-full rounded-lg" />
                <Button
                  onClick={handleAnalyze}
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Scissors className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Analyze Video
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              Interesting moments identified in the video
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {timecodes.length > 0 ? (
                <div className="space-y-4">
                  {timecodes.map((timecode, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {timecode.start} - {timecode.end}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateClip(timecode, index)}
                            disabled={isClipping === index}
                          >
                            <Scissors
                              className={`h-4 w-4 mr-2 ${
                                isClipping === index ? "animate-spin" : ""
                              }`}
                            />
                            {isClipping === index
                              ? "Creating..."
                              : "Create Clip"}
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600">
                          {timecode.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {isProcessing
                    ? "Analyzing video..."
                    : "Upload and analyze a video to see results"}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
