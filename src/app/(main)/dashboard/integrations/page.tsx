"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

export default function IntegrationsPage() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState({
    instagram: {
      accessToken: "",
      clientId: "",
      clientSecret: "",
    },
    tiktok: {
      accessToken: "",
      clientId: "",
      clientSecret: "",
    },
  });

  const handleSave = async (platform: "instagram" | "tiktok") => {
    try {
      localStorage.setItem(
        `${platform}_credentials`,
        JSON.stringify(credentials[platform])
      );
      toast({
        title: "Success",
        description: `${platform} credentials saved successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save ${platform} credentials`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">API Integrations</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instagram API</CardTitle>
            <CardDescription>
              Connect your Instagram account to enable direct posting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instagram-client-id">Client ID</Label>
              <Input
                id="instagram-client-id"
                value={credentials.instagram.clientId}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    instagram: {
                      ...credentials.instagram,
                      clientId: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram-client-secret">Client Secret</Label>
              <Input
                id="instagram-client-secret"
                type="password"
                value={credentials.instagram.clientSecret}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    instagram: {
                      ...credentials.instagram,
                      clientSecret: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram-access-token">Access Token</Label>
              <Input
                id="instagram-access-token"
                type="password"
                value={credentials.instagram.accessToken}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    instagram: {
                      ...credentials.instagram,
                      accessToken: e.target.value,
                    },
                  })
                }
              />
            </div>
            <Button onClick={() => handleSave("instagram")}>
              Save Instagram Credentials
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>TikTok API</CardTitle>
            <CardDescription>
              Connect your TikTok account to enable direct posting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tiktok-client-id">Client ID</Label>
              <Input
                id="tiktok-client-id"
                value={credentials.tiktok.clientId}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    tiktok: {
                      ...credentials.tiktok,
                      clientId: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok-client-secret">Client Secret</Label>
              <Input
                id="tiktok-client-secret"
                type="password"
                value={credentials.tiktok.clientSecret}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    tiktok: {
                      ...credentials.tiktok,
                      clientSecret: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok-access-token">Access Token</Label>
              <Input
                id="tiktok-access-token"
                type="password"
                value={credentials.tiktok.accessToken}
                onChange={(e) =>
                  setCredentials({
                    ...credentials,
                    tiktok: {
                      ...credentials.tiktok,
                      accessToken: e.target.value,
                    },
                  })
                }
              />
            </div>
            <Button onClick={() => handleSave("tiktok")}>
              Save TikTok Credentials
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
