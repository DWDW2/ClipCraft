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
import { Video, Upload, Scissors, Hash, Subtitles, Edit } from "lucide-react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface Timecode {
  id: string;
  start: string;
  end: string;
  description: string;
  clipUrl?: string;
  clipCreationFailed?: boolean;
  hashtags?: string[];
  subtitles?: {
    text: string;
    mode: "ai" | "manual";
  };
  subtitledClipUrl?: string;
  isGeneratingSubtitles?: boolean;
}

interface ScheduleItem {
  date: string;
  clips: number[];
  postingTime: string;
  reason: string;
}

interface ProcessedVideo {
  videoData: string;
  timestamp: number;
}

export default function ProcessVideoPage() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [timecodes, setTimecodes] = useState<Timecode[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClipping, setIsClipping] = useState<number | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState<
    number | null
  >(null);
  const [manualSubtitleText, setManualSubtitleText] = useState<string>("");
  const [isEmbeddingSubtitles, setIsEmbeddingSubtitles] = useState<
    number | null
  >(null);
  const [processedVideos, setProcessedVideos] = useState<ProcessedVideo[]>([]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setVideoUrl(null);
    setTimecodes([]);
    setSchedule([]);

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
    setTimecodes([]);
    setSchedule([]);
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await response.json();
      if (!data.timecodes || !Array.isArray(data.timecodes)) {
        throw new Error("Invalid response format");
      }

      // Generate hashtags for each timecode
      const timecodesWithHashtags = await Promise.all(
        data.timecodes.map(async (tc: Omit<Timecode, "clipUrl" | "id">) => {
          try {
            const hashtagResponse = await fetch("/api/generate-hashtags", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                description: tc.description,
              }),
            });

            if (!hashtagResponse.ok) {
              console.warn("Failed to generate hashtags for timecode:", tc);
              return {
                ...tc,
                id: crypto.randomUUID(),
                clipUrl: undefined,
                clipCreationFailed: false,
                hashtags: [],
              };
            }

            const hashtagData = await hashtagResponse.json();
            return {
              ...tc,
              id: crypto.randomUUID(),
              clipUrl: undefined,
              clipCreationFailed: false,
              hashtags: hashtagData.hashtags || [],
            };
          } catch (error) {
            console.error("Error generating hashtags:", error);
            return {
              ...tc,
              id: crypto.randomUUID(),
              clipUrl: undefined,
              clipCreationFailed: false,
              hashtags: [],
            };
          }
        })
      );

      setTimecodes(timecodesWithHashtags);

      // Generate schedule after analysis
      try {
        await handleGenerateSchedule(timecodesWithHashtags);
      } catch (error) {
        console.error("Failed to generate schedule:", error);
        toast({
          title: "Warning",
          description: "Analysis complete, but schedule generation failed",
          variant: "destructive",
        });
      }

      toast({
        title: "Success",
        description: "Video analysis complete",
      });
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to analyze video",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSchedule = async (clips: Timecode[]) => {
    setIsGeneratingSchedule(true);
    try {
      const response = await fetch("/api/generate-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timecodes: clips,
        }),
      });

      if (!response.ok) throw new Error("Schedule generation failed");

      const data = await response.json();
      setSchedule(data.schedule);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate schedule",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSchedule(false);
    }
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

      setTimecodes((prevTimecodes) =>
        prevTimecodes.map((tc, i) =>
          i === index
            ? { ...tc, clipUrl: data.clipUrl, clipCreationFailed: false }
            : tc
        )
      );

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
      setTimecodes((prevTimecodes) =>
        prevTimecodes.map((tc, i) =>
          i === index
            ? { ...tc, clipUrl: undefined, clipCreationFailed: true }
            : tc
        )
      );
      toast({
        title: "Error",
        description: "Failed to create clip",
        variant: "destructive",
      });
    } finally {
      setIsClipping(null);
    }
  };

  const handleGenerateSubtitles = async (timecode: Timecode) => {
    if (!videoUrl || !timecode.clipUrl) {
      toast({
        title: "Error",
        description: "Please create a clip first",
        variant: "destructive",
      });
      return;
    }

    try {
      setTimecodes((prev) =>
        prev.map((tc) =>
          tc.id === timecode.id ? { ...tc, isGeneratingSubtitles: true } : tc
        )
      );

      // Generate subtitles for the clip
      const response = await fetch("/api/generate-subtitles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: timecode.clipUrl,
          start: timecode.start,
          end: timecode.end,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate subtitles");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to generate subtitles");
      }

      // Add the processed video to the list
      setProcessedVideos((prev) => [
        ...prev,
        {
          videoData: data.videoData,
          timestamp: Date.now(),
        },
      ]);

      toast({
        title: "Success",
        description: "Subtitles added successfully",
      });
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add subtitles",
        variant: "destructive",
      });
    } finally {
      setTimecodes((prev) =>
        prev.map((tc) =>
          tc.id === timecode.id ? { ...tc, isGeneratingSubtitles: false } : tc
        )
      );
    }
  };

  const handleManualSubtitles = (timecode: Timecode, index: number) => {
    setTimecodes((prevTimecodes) =>
      prevTimecodes.map((tc, i) =>
        i === index
          ? { ...tc, subtitles: { text: manualSubtitleText, mode: "manual" } }
          : tc
      )
    );
    setManualSubtitleText("");
    toast({
      title: "Success",
      description: "Manual subtitles added successfully",
    });
  };

  const handleEmbedSubtitles = async (timecode: Timecode, index: number) => {
    if (!timecode.clipUrl || !timecode.subtitles) return;

    setIsEmbeddingSubtitles(index);
    try {
      const response = await fetch("/api/add-subtitles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl: timecode.clipUrl,
          subtitles: timecode.subtitles.text,
          start: convertTimeToSeconds(timecode.start),
          end: convertTimeToSeconds(timecode.end),
        }),
      });

      if (!response.ok) throw new Error("Failed to embed subtitles");

      const data = await response.json();

      setTimecodes((prevTimecodes) =>
        prevTimecodes.map((tc, i) =>
          i === index ? { ...tc, subtitledClipUrl: data.videoData } : tc
        )
      );

      // Clean up files after successful processing
      await fetch("/api/cleanup-files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filePaths: data.filePaths,
        }),
      });

      toast({
        title: "Success",
        description: "Subtitles embedded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to embed subtitles",
        variant: "destructive",
      });
    } finally {
      setIsEmbeddingSubtitles(null);
    }
  };

  const convertTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(":").map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Process Video</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>1. Upload Video</CardTitle>
            <CardDescription>
              Upload a video to analyze and create clips.
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
                  {isUploading
                    ? `Uploading... ${uploadProgress}%`
                    : "Click to upload video"}
                </span>
              </label>
            </div>

            {isUploading && uploadProgress < 100 && (
              <Progress value={uploadProgress} className="w-full" />
            )}

            {videoUrl && (
              <div className="space-y-4 mt-4">
                <video
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg max-h-60 object-contain"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={isProcessing || isUploading}
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
                      2. Analyze Video
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. Analysis Results & Clips</CardTitle>
            <CardDescription>
              Identified moments and generated clips.
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
                          <div className="flex flex-wrap gap-2">
                            {!timecode.clipUrl &&
                              !timecode.clipCreationFailed && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleCreateClip(timecode, index)
                                  }
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
                              )}
                            {timecode.clipUrl && !timecode.subtitles && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleGenerateSubtitles(timecode)
                                  }
                                  disabled={
                                    isGeneratingSubtitles === timecode.id
                                  }
                                >
                                  {isGeneratingSubtitles === timecode.id ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Adding Subtitles...
                                    </>
                                  ) : (
                                    <>
                                      <Subtitles className="mr-2 h-4 w-4" />
                                      Add Subtitles
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const text = prompt("Enter subtitles:");
                                    if (text) {
                                      setManualSubtitleText(text);
                                      handleManualSubtitles(timecode, index);
                                    }
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Manual Subtitles
                                </Button>
                              </div>
                            )}
                            {timecode.clipUrl && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  window.open(timecode.clipUrl, "_blank")
                                }
                              >
                                View Clip
                              </Button>
                            )}
                            {timecode.clipCreationFailed && (
                              <span className="text-xs text-red-500 self-center">
                                Clip creation failed.
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-1"
                                  onClick={() =>
                                    handleCreateClip(timecode, index)
                                  }
                                >
                                  Retry
                                </Button>
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          {timecode.description}
                        </p>
                        {timecode.subtitles && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                            <p className="text-sm">
                              <span className="font-medium">
                                Subtitles ({timecode.subtitles.mode}):
                              </span>{" "}
                              {timecode.subtitles.text}
                            </p>
                            {timecode.subtitledClipUrl && (
                              <div className="mt-2">
                                <video
                                  src={timecode.subtitledClipUrl}
                                  controls
                                  className="w-full rounded-lg max-h-40 object-contain"
                                />
                              </div>
                            )}
                          </div>
                        )}
                        {timecode.hashtags && timecode.hashtags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {timecode.hashtags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                <Hash className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {isProcessing
                    ? "Analyzing video..."
                    : videoUrl
                    ? "Analysis complete, or no interesting moments found. Press 'Analyze Video' again if needed."
                    : "Upload and analyze a video to see results."}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Content Schedule</CardTitle>
            <CardDescription>
              AI-generated content schedule for optimal engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {isGeneratingSchedule ? (
                <div className="text-center text-gray-500 py-8">
                  Generating optimal schedule...
                </div>
              ) : schedule.length > 0 ? (
                <div className="space-y-4">
                  {schedule.map((item, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {format(new Date(item.date), "PPP")} at{" "}
                          {item.postingTime}
                        </CardTitle>
                        <CardDescription>{item.reason}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {item.clips.map((clipIndex) => {
                            const clip = timecodes[clipIndex];
                            return (
                              <div
                                key={clipIndex}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {clip.start} - {clip.end}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {clip.description}
                                  </p>
                                </div>
                                {clip.clipUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      window.open(clip.clipUrl, "_blank")
                                    }
                                  >
                                    View Clip
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {timecodes.length > 0
                    ? "Schedule will be generated after video analysis"
                    : "Upload and analyze a video to generate a schedule"}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Processed Videos Section */}
      {processedVideos.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Processed Videos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedVideos.map((video, index) => (
              <div
                key={video.timestamp}
                className="bg-card rounded-lg shadow-lg overflow-hidden"
              >
                <div className="aspect-video relative">
                  <video
                    src={video.videoData}
                    controls
                    className="w-full h-full object-cover"
                    poster={videoUrl || undefined}
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Processed {new Date(video.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
