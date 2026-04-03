import { useGetGuildConfig, useUpdateGuildConfig, useGetGuildChannels, useGetEmbeds, getGetGuildConfigQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GuildGoodbye() {
  const { guildId } = useParams<{ guildId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: config, isLoading: isConfigLoading } = useGetGuildConfig(guildId || "", {
    query: { enabled: !!guildId, queryKey: getGetGuildConfigQueryKey(guildId || "") }
  });
  
  const { data: channels } = useGetGuildChannels(guildId || "", {
    query: { enabled: !!guildId }
  });
  
  const { data: embeds } = useGetEmbeds(guildId || "", {
    query: { enabled: !!guildId }
  });

  const updateConfig = useUpdateGuildConfig();

  const [enabled, setEnabled] = useState(false);
  const [channelId, setChannelId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [embedId, setEmbedId] = useState<string>("none");

  useEffect(() => {
    if (config) {
      setEnabled(config.goodbye.enabled);
      setChannelId(config.goodbye.channelId || "");
      setMessage(config.goodbye.message || "");
      setEmbedId(config.goodbye.embedId || "none");
    }
  }, [config]);

  const handleSave = () => {
    if (!guildId) return;

    updateConfig.mutate({
      guildId,
      data: {
        goodbye: {
          enabled,
          channelId: channelId || null,
          message: message || null,
          embedId: embedId === "none" ? null : embedId
        }
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Settings saved",
          description: "Goodbye system configuration has been updated.",
        });
        queryClient.invalidateQueries({ queryKey: getGetGuildConfigQueryKey(guildId) });
      },
      onError: (error) => {
        toast({
          title: "Error saving settings",
          description: error.error || "An unexpected error occurred.",
          variant: "destructive"
        });
      }
    });
  };

  const textChannels = channels?.filter(c => c.type === 0 || c.type === 5) || [];

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Goodbye System</h1>
          <p className="text-muted-foreground">Send a message when members leave your server.</p>
        </div>

        {isConfigLoading ? (
          <Skeleton className="h-[400px] w-full rounded-xl" />
        ) : (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Goodbye Message</CardTitle>
                  <CardDescription>Configure where and how to bid farewell to users.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="goodbye-enable" className="text-sm font-medium">
                    {enabled ? "Enabled" : "Disabled"}
                  </Label>
                  <Switch 
                    id="goodbye-enable" 
                    checked={enabled} 
                    onCheckedChange={setEnabled} 
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className={`space-y-6 transition-opacity ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-2">
                  <Label htmlFor="channel">Goodbye Channel</Label>
                  <Select value={channelId} onValueChange={setChannelId} disabled={!enabled}>
                    <SelectTrigger id="channel">
                      <SelectValue placeholder="Select a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {textChannels.map(c => (
                        <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
                      ))}
                      {textChannels.length === 0 && (
                        <SelectItem value="none" disabled>No text channels found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message Text</Label>
                  <Textarea 
                    id="message" 
                    placeholder="{username} has left the server. We're down to {memberCount} members."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    disabled={!enabled}
                    className="font-mono text-sm"
                  />
                  <div className="flex flex-wrap gap-2 pt-2">
                    {["{user}", "{username}", "{server}", "{memberCount}"].map(variable => (
                      <div key={variable} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded font-mono border border-border cursor-help" title={`Insert ${variable}`}>
                        {variable}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="embed">Include Embed</Label>
                  <Select value={embedId} onValueChange={setEmbedId} disabled={!enabled}>
                    <SelectTrigger id="embed">
                      <SelectValue placeholder="Select an embed (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Text only)</SelectItem>
                      {embeds?.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="bg-muted/20 border-t border-border px-6 py-4">
              <Button onClick={handleSave} disabled={updateConfig.isPending} className="ml-auto min-w-[120px]">
                {updateConfig.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}