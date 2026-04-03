import { useGetGuildConfig, useUpdateGuildConfig, useGetGuildChannels, getGetGuildConfigQueryKey } from "@workspace/api-client-react";
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
import { Checkbox } from "@/components/ui/checkbox";

export default function GuildLogging() {
  const { guildId } = useParams<{ guildId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: config, isLoading: isConfigLoading } = useGetGuildConfig(guildId || "", {
    query: { enabled: !!guildId, queryKey: getGetGuildConfigQueryKey(guildId || "") }
  });
  
  const { data: channels } = useGetGuildChannels(guildId || "", {
    query: { enabled: !!guildId }
  });

  const updateConfig = useUpdateGuildConfig();

  const [enabled, setEnabled] = useState(false);
  const [channelId, setChannelId] = useState<string>("");
  const [logEvents, setLogEvents] = useState({
    logJoins: false,
    logLeaves: false,
    logMessageDeletes: false,
    logMessageEdits: false,
    logModActions: false,
  });

  useEffect(() => {
    if (config) {
      setEnabled(config.logging.enabled);
      setChannelId(config.logging.channelId || "");
      setLogEvents({
        logJoins: config.logging.logJoins,
        logLeaves: config.logging.logLeaves,
        logMessageDeletes: config.logging.logMessageDeletes,
        logMessageEdits: config.logging.logMessageEdits,
        logModActions: config.logging.logModActions,
      });
    }
  }, [config]);

  const handleSave = () => {
    if (!guildId) return;

    updateConfig.mutate({
      guildId,
      data: {
        logging: {
          enabled,
          channelId: channelId || null,
          ...logEvents
        }
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Settings saved",
          description: "Logging configuration has been updated.",
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
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Logging</h1>
          <p className="text-muted-foreground">Keep track of everything happening in your server.</p>
        </div>

        {isConfigLoading ? (
          <Skeleton className="h-[400px] w-full rounded-xl" />
        ) : (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Server Audit Logs</CardTitle>
                  <CardDescription>Select which events to log and where.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="log-enable" className="text-sm font-medium">
                    {enabled ? "Enabled" : "Disabled"}
                  </Label>
                  <Switch 
                    id="log-enable" 
                    checked={enabled} 
                    onCheckedChange={setEnabled} 
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className={`space-y-6 transition-opacity ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-2">
                  <Label htmlFor="log-channel">Log Channel</Label>
                  <Select value={channelId} onValueChange={setChannelId} disabled={!enabled}>
                    <SelectTrigger id="log-channel">
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

                <div className="space-y-4 pt-4">
                  <Label className="text-base">Events to log</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 border border-border p-3 rounded-lg">
                      <Checkbox 
                        id="logJoins" 
                        checked={logEvents.logJoins}
                        onCheckedChange={(c) => setLogEvents(prev => ({...prev, logJoins: !!c}))}
                        disabled={!enabled}
                      />
                      <label htmlFor="logJoins" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Member Joins
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 border border-border p-3 rounded-lg">
                      <Checkbox 
                        id="logLeaves" 
                        checked={logEvents.logLeaves}
                        onCheckedChange={(c) => setLogEvents(prev => ({...prev, logLeaves: !!c}))}
                        disabled={!enabled}
                      />
                      <label htmlFor="logLeaves" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Member Leaves
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 border border-border p-3 rounded-lg">
                      <Checkbox 
                        id="logMessageDeletes" 
                        checked={logEvents.logMessageDeletes}
                        onCheckedChange={(c) => setLogEvents(prev => ({...prev, logMessageDeletes: !!c}))}
                        disabled={!enabled}
                      />
                      <label htmlFor="logMessageDeletes" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Message Deletions
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 border border-border p-3 rounded-lg">
                      <Checkbox 
                        id="logMessageEdits" 
                        checked={logEvents.logMessageEdits}
                        onCheckedChange={(c) => setLogEvents(prev => ({...prev, logMessageEdits: !!c}))}
                        disabled={!enabled}
                      />
                      <label htmlFor="logMessageEdits" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Message Edits
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 border border-border p-3 rounded-lg">
                      <Checkbox 
                        id="logModActions" 
                        checked={logEvents.logModActions}
                        onCheckedChange={(c) => setLogEvents(prev => ({...prev, logModActions: !!c}))}
                        disabled={!enabled}
                      />
                      <label htmlFor="logModActions" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Moderation Actions
                      </label>
                    </div>
                  </div>
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