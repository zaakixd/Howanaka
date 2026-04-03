import { useGetGuildConfig, useUpdateGuildConfig, useGetGuildChannels, useGetGuildRoles, getGetGuildConfigQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GuildModeration() {
  const { guildId } = useParams<{ guildId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: config, isLoading: isConfigLoading } = useGetGuildConfig(guildId || "", {
    query: { enabled: !!guildId, queryKey: getGetGuildConfigQueryKey(guildId || "") }
  });
  
  const { data: channels } = useGetGuildChannels(guildId || "", {
    query: { enabled: !!guildId }
  });

  const { data: roles } = useGetGuildRoles(guildId || "", {
    query: { enabled: !!guildId }
  });

  const updateConfig = useUpdateGuildConfig();

  const [enabled, setEnabled] = useState(false);
  const [logChannelId, setLogChannelId] = useState<string>("");
  const [muteRoleId, setMuteRoleId] = useState<string>("");

  useEffect(() => {
    if (config) {
      setEnabled(config.moderation.enabled);
      setLogChannelId(config.moderation.logChannelId || "");
      setMuteRoleId(config.moderation.muteRoleId || "");
    }
  }, [config]);

  const handleSave = () => {
    if (!guildId) return;

    updateConfig.mutate({
      guildId,
      data: {
        moderation: {
          enabled,
          logChannelId: logChannelId || null,
          muteRoleId: muteRoleId || null
        }
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Settings saved",
          description: "Moderation configuration has been updated.",
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
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Moderation</h1>
          <p className="text-muted-foreground">Configure moderation tools for your server.</p>
        </div>

        {isConfigLoading ? (
          <Skeleton className="h-[400px] w-full rounded-xl" />
        ) : (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Moderation Settings</CardTitle>
                  <CardDescription>Set up the mod log and mute role.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="mod-enable" className="text-sm font-medium">
                    {enabled ? "Enabled" : "Disabled"}
                  </Label>
                  <Switch 
                    id="mod-enable" 
                    checked={enabled} 
                    onCheckedChange={setEnabled} 
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className={`space-y-6 transition-opacity ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-2">
                  <Label htmlFor="mod-channel">Mod Log Channel</Label>
                  <Select value={logChannelId} onValueChange={setLogChannelId} disabled={!enabled}>
                    <SelectTrigger id="mod-channel">
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
                  <p className="text-xs text-muted-foreground">
                    Moderator actions (kick, ban, mute) will be logged here.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mute-role">Mute Role</Label>
                  <Select value={muteRoleId} onValueChange={setMuteRoleId} disabled={!enabled}>
                    <SelectTrigger id="mute-role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles?.map(r => (
                        <SelectItem key={r.id} value={r.id}>@{r.name}</SelectItem>
                      ))}
                      {(!roles || roles.length === 0) && (
                        <SelectItem value="none" disabled>No roles found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This role will be assigned to users when they are muted. Make sure it has "Send Messages" disabled in channels.
                  </p>
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