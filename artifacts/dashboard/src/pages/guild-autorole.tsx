import { useGetGuildConfig, useUpdateGuildConfig, useGetGuildRoles, getGetGuildConfigQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function GuildAutoRole() {
  const { guildId } = useParams<{ guildId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: config, isLoading: isConfigLoading } = useGetGuildConfig(guildId || "", {
    query: { enabled: !!guildId, queryKey: getGetGuildConfigQueryKey(guildId || "") }
  });
  
  const { data: roles } = useGetGuildRoles(guildId || "", {
    query: { enabled: !!guildId }
  });

  const updateConfig = useUpdateGuildConfig();

  const [enabled, setEnabled] = useState(false);
  const [roleIds, setRoleIds] = useState<string[]>([]);

  useEffect(() => {
    if (config) {
      setEnabled(config.autoRole.enabled);
      setRoleIds(config.autoRole.roleIds || []);
    }
  }, [config]);

  const handleSave = () => {
    if (!guildId) return;

    updateConfig.mutate({
      guildId,
      data: {
        autoRole: {
          enabled,
          roleIds
        }
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Settings saved",
          description: "Auto-role configuration has been updated.",
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

  const handleAddRole = (id: string) => {
    if (id && !roleIds.includes(id)) {
      setRoleIds([...roleIds, id]);
    }
  };

  const handleRemoveRole = (id: string) => {
    setRoleIds(roleIds.filter(r => r !== id));
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Auto-Role</h1>
          <p className="text-muted-foreground">Automatically assign roles to members when they join.</p>
        </div>

        {isConfigLoading ? (
          <Skeleton className="h-[400px] w-full rounded-xl" />
        ) : (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>On-Join Roles</CardTitle>
                  <CardDescription>Users will receive these roles immediately upon joining.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="autorole-enable" className="text-sm font-medium">
                    {enabled ? "Enabled" : "Disabled"}
                  </Label>
                  <Switch 
                    id="autorole-enable" 
                    checked={enabled} 
                    onCheckedChange={setEnabled} 
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className={`space-y-6 transition-opacity ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-4">
                  <Label>Selected Roles</Label>
                  <div className="flex flex-wrap gap-2 min-h-[42px] p-2 border border-border rounded-lg bg-background">
                    {roleIds.length === 0 ? (
                      <span className="text-muted-foreground text-sm p-1">No roles selected</span>
                    ) : (
                      roleIds.map(id => {
                        const role = roles?.find(r => r.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm border border-border">
                            {role ? `@${role.name}` : `Unknown (${id})`}
                            <button onClick={() => handleRemoveRole(id)} className="ml-1 text-muted-foreground hover:text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-role">Add Role</Label>
                  <Select onValueChange={handleAddRole} disabled={!enabled}>
                    <SelectTrigger id="add-role">
                      <SelectValue placeholder="Select a role to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles?.filter(r => !roleIds.includes(r.id)).map(r => (
                        <SelectItem key={r.id} value={r.id}>@{r.name}</SelectItem>
                      ))}
                      {(!roles || roles.filter(r => !roleIds.includes(r.id)).length === 0) && (
                        <SelectItem value="none" disabled>No more roles available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Make sure the bot's role is placed above these roles in the server settings, otherwise it cannot assign them.
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