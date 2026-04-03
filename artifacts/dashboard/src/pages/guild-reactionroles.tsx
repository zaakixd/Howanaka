import { useGetGuildConfig, useUpdateGuildConfig, useGetGuildRoles, getGetGuildConfigQueryKey } from "@workspace/api-client-react";
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
import { Save, Loader2, Plus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReactionRoleItem {
  emoji: string;
  roleId: string;
}

export default function GuildReactionRoles() {
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
  const [items, setItems] = useState<ReactionRoleItem[]>([]);

  useEffect(() => {
    if (config) {
      setEnabled(config.reactionRoles.enabled);
      setItems(config.reactionRoles.items || []);
    }
  }, [config]);

  const handleSave = () => {
    if (!guildId) return;

    // filter out incomplete items
    const validItems = items.filter(i => i.emoji && i.roleId);

    updateConfig.mutate({
      guildId,
      data: {
        reactionRoles: {
          enabled,
          items: validItems
        }
      }
    }, {
      onSuccess: () => {
        toast({
          title: "Settings saved",
          description: "Reaction roles configuration has been updated.",
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

  const handleAddItem = () => {
    setItems([...items, { emoji: "", roleId: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleUpdateItem = (index: number, field: keyof ReactionRoleItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Reaction Roles</h1>
          <p className="text-muted-foreground">Let users self-assign roles by reacting to a message.</p>
        </div>

        {isConfigLoading ? (
          <Skeleton className="h-[400px] w-full rounded-xl" />
        ) : (
          <Card className="border-border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Role Mappings</CardTitle>
                  <CardDescription>Map emojis to roles. Setup via discord command required after saving.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="reaction-enable" className="text-sm font-medium">
                    {enabled ? "Enabled" : "Disabled"}
                  </Label>
                  <Switch 
                    id="reaction-enable" 
                    checked={enabled} 
                    onCheckedChange={setEnabled} 
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className={`space-y-4 transition-opacity ${!enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                
                {items.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-border rounded-lg bg-muted/20">
                    <p className="text-muted-foreground mb-4">No reaction roles configured.</p>
                    <Button variant="outline" onClick={handleAddItem} disabled={!enabled}>
                      <Plus className="w-4 h-4 mr-2" /> Add First Mapping
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-4 px-2 py-1 text-sm font-medium text-muted-foreground">
                      <div className="col-span-3">Emoji</div>
                      <div className="col-span-8">Role</div>
                      <div className="col-span-1 text-center">Action</div>
                    </div>
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3">
                          <Input 
                            value={item.emoji} 
                            onChange={(e) => handleUpdateItem(index, 'emoji', e.target.value)} 
                            placeholder="👍"
                            disabled={!enabled}
                            className="text-center text-xl"
                          />
                        </div>
                        <div className="col-span-8">
                          <Select 
                            value={item.roleId} 
                            onValueChange={(val) => handleUpdateItem(index, 'roleId', val)}
                            disabled={!enabled}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              {roles?.map(r => (
                                <SelectItem key={r.id} value={r.id}>@{r.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveItem(index)}
                            disabled={!enabled}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Button variant="outline" onClick={handleAddItem} disabled={!enabled} className="w-full mt-4 border-dashed">
                      <Plus className="w-4 h-4 mr-2" /> Add Mapping
                    </Button>
                  </div>
                )}
                
                {enabled && items.length > 0 && (
                  <div className="mt-6 p-4 bg-secondary text-secondary-foreground rounded-lg border border-border text-sm">
                    <strong>Note:</strong> After saving, use the <code>/reactionrole setup</code> command in your Discord server to deploy the message.
                  </div>
                )}
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