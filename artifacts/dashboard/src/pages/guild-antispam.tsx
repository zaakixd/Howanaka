import { useGetGuildConfig, useUpdateGuildConfig, getGetGuildConfigQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GuildAntiSpam() {
  const { guildId } = useParams<{ guildId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: config, isLoading: isConfigLoading } = useGetGuildConfig(guildId || "", {
    query: { enabled: !!guildId, queryKey: getGetGuildConfigQueryKey(guildId || "") }
  });

  const updateConfig = useUpdateGuildConfig();

  const [enabled, setEnabled] = useState(false);
  const [maxMessages, setMaxMessages] = useState<number>(5);
  const [timeWindowSeconds, setTimeWindowSeconds] = useState<number>(5);
  const [action, setAction] = useState<string>("mute");

  useEffect(() => {
    if (config) {
      setEnabled(config.antiSpam.enabled);
      setMaxMessages(config.antiSpam.maxMessages);
      setTimeWindowSeconds(config.antiSpam.timeWindowSeconds);
      setAction(config.antiSpam.action);
    }
  }, [config]);

  const handleSave = () => {
    if (!guildId) return;

    updateConfig.mutate({
      guildId,
      data: {
        antiSpam: {
          enabled,
          maxMessages,
          timeWindowSeconds,
          action
        }
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Settings saved",
          description: "Anti-spam configuration has been updated.",
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

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Anti-Spam</h1>
          <p className="text-muted-foreground">Protect your server from rapid-fire messages.</p>
        </div>

        {isConfigLoading ? (
          <Skeleton className="h-[400px] w-full rounded-xl" />
        ) : (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Spam Protection</CardTitle>
                  <CardDescription>Automatically punish users who send too many messages too quickly.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="antispam-enable" className="text-sm font-medium">
                    {enabled ? "Enabled" : "Disabled"}
                  </Label>
                  <Switch 
                    id="antispam-enable" 
                    checked={enabled} 
                    onCheckedChange={setEnabled} 
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className={`space-y-6 transition-opacity ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="max-messages">Max Messages</Label>
                    <Input 
                      id="max-messages" 
                      type="number" 
                      min={2} 
                      max={20} 
                      value={maxMessages} 
                      onChange={(e) => setMaxMessages(parseInt(e.target.value) || 5)}
                      disabled={!enabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of messages allowed before triggering the action.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time-window">Time Window (seconds)</Label>
                    <Input 
                      id="time-window" 
                      type="number" 
                      min={1} 
                      max={60} 
                      value={timeWindowSeconds} 
                      onChange={(e) => setTimeWindowSeconds(parseInt(e.target.value) || 5)}
                      disabled={!enabled}
                    />
                    <p className="text-xs text-muted-foreground">
                      The timeframe in which messages are counted.
                    </p>
                  </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 text-sm text-foreground mb-4">
                  Trigger condition: <strong>{maxMessages} messages</strong> sent within <strong>{timeWindowSeconds} seconds</strong>.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="punishment">Action to take</Label>
                  <Select value={action} onValueChange={setAction} disabled={!enabled}>
                    <SelectTrigger id="punishment">
                      <SelectValue placeholder="Select an action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warn">Warn User</SelectItem>
                      <SelectItem value="mute">Mute User (requires Mute Role set in Moderation)</SelectItem>
                      <SelectItem value="kick">Kick User</SelectItem>
                      <SelectItem value="ban">Ban User</SelectItem>
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