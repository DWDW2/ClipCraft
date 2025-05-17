// app/clips/download-button.tsx
"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadButtonProps {
  url: string;
  displayName: string;
}

export default function DownloadButton({
  url,
  displayName,
}: DownloadButtonProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${displayName}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="h-4 w-4" />
    </Button>
  );
}
