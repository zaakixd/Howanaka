import { useGetEmbed, useCreateEmbed, useUpdateEmbed, useSendEmbed, useGetGuildChannels, getGetEmbedsQueryKey, getGetEmbedQueryKey } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, ArrowLeft, Plus, Trash2, Send, Palette } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export default function GuildEmbedEditor() {
  const { guildId, embedId } = useParams<{ guildId: string, embedId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isNew = !embedId || embedId === "new";
  
  const { data: embed, isLoading: isEmbedLoading } = useGetEmbed(guildId || "", embedId || "", {
    query: { enabled: !!guildId && !isNew, queryKey: getGetEmbedQueryKey(guildId || "", embedId || "") }
  });

  const { data: channels } = useGetGuildChannels(guildId || "", {
    query: { enabled: !!guildId && !isNew }
  });

  const createEmbed = useCreateEmbed();
  const updateEmbed = useUpdateEmbed();
  const sendEmbed = useSendEmbed();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#202225");
  const [authorName, setAuthorName] = useState("");
  const [authorIconUrl, setAuthorIconUrl] = useState("");
  const [authorUrl, setAuthorUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [footerText, setFooterText] = useState("");
  const [footerIconUrl, setFooterIconUrl] = useState("");
  const [fields, setFields] = useState<EmbedField[]>([]);
  
  const [sendChannelId, setSendChannelId] = useState<string>("");
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);

  useEffect(() => {
    if (embed && !isNew) {
      setName(embed.name);
      setTitle(embed.title || "");
      setDescription(embed.description || "");
      setColor(embed.color || "#202225");
      setAuthorName(embed.authorName || "");
      setAuthorIconUrl(embed.authorIconUrl || "");
      setAuthorUrl(embed.authorUrl || "");
      setThumbnailUrl(embed.thumbnailUrl || "");
      setImageUrl(embed.imageUrl || "");
      setFooterText(embed.footerText || "");
      setFooterIconUrl(embed.footerIconUrl || "");
      setFields(embed.fields || []);
    }
  }, [embed, isNew]);

  const handleSave = () => {
    if (!guildId) return;

    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Embed name is required.", variant: "destructive" });
      return;
    }

    const payload = {
      name,
      title: title || null,
      description: description || null,
      color: color || null,
      authorName: authorName || null,
      authorIconUrl: authorIconUrl || null,
      authorUrl: authorUrl || null,
      thumbnailUrl: thumbnailUrl || null,
      imageUrl: imageUrl || null,
      footerText: footerText || null,
      footerIconUrl: footerIconUrl || null,
      fields: fields.filter(f => f.name && f.value)
    };

    if (isNew) {
      createEmbed.mutate({
        guildId,
        data: payload
      }, {
        onSuccess: (newEmbed) => {
          toast({ title: "Embed created", description: "Your embed has been saved." });
          queryClient.invalidateQueries({ queryKey: getGetEmbedsQueryKey(guildId) });
          setLocation(`/guild/${guildId}/embeds/${newEmbed.id}`);
        },
        onError: (error) => {
          toast({ title: "Error creating embed", description: error.error || "An unexpected error occurred.", variant: "destructive" });
        }
      });
    } else {
      updateEmbed.mutate({
        guildId,
        embedId: embedId!,
        data: payload
      }, {
        onSuccess: () => {
          toast({ title: "Embed updated", description: "Your embed changes have been saved." });
          queryClient.invalidateQueries({ queryKey: getGetEmbedsQueryKey(guildId) });
          queryClient.invalidateQueries({ queryKey: getGetEmbedQueryKey(guildId, embedId!) });
        },
        onError: (error) => {
          toast({ title: "Error updating embed", description: error.error || "An unexpected error occurred.", variant: "destructive" });
        }
      });
    }
  };

  const handleSend = () => {
    if (!guildId || !embedId || !sendChannelId) return;
    
    sendEmbed.mutate({
      guildId,
      embedId,
      data: { channelId: sendChannelId }
    }, {
      onSuccess: () => {
        toast({ title: "Embed Sent!", description: "The embed was successfully sent to the channel." });
        setIsSendDialogOpen(false);
      },
      onError: (error) => {
        toast({ title: "Error sending embed", description: error.error || "An unexpected error occurred.", variant: "destructive" });
      }
    });
  };

  const handleAddField = () => {
    if (fields.length >= 25) {
      toast({ title: "Limit reached", description: "Discord embeds can have a maximum of 25 fields.", variant: "destructive" });
      return;
    }
    setFields([...fields, { name: "New Field", value: "Field value", inline: false }]);
  };

  const handleUpdateField = (index: number, key: keyof EmbedField, value: any) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const handleRemoveField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  const isSaving = createEmbed.isPending || updateEmbed.isPending;
  const textChannels = channels?.filter(c => c.type === 0 || c.type === 5) || [];

  // Helper to format variables in text (makes them look highlighted)
  const formatTextWithVariables = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\{user\}|\{username\}|\{server\}|\{memberCount\})/g);
    return parts.map((part, i) => {
      if (['{user}', '{username}', '{server}', '{memberCount}'].includes(part)) {
        return <span key={i} className="bg-primary/20 text-primary-foreground/90 px-1 rounded-sm text-[0.9em]">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen">
        <div className="p-4 md:p-6 border-b border-border bg-card/50 flex items-center justify-between z-10 sticky top-0 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation(`/guild/${guildId}/embeds`)} className="-ml-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{isNew ? "Create New Embed" : "Edit Embed"}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!isNew && (
              <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" className="hidden sm:flex">
                    <Send className="w-4 h-4 mr-2" /> Send to Channel
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Embed to Channel</DialogTitle>
                    <DialogDescription>
                      Select a channel to send this embed to immediately.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Channel</Label>
                      <Select value={sendChannelId} onValueChange={setSendChannelId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a channel" />
                        </SelectTrigger>
                        <SelectContent>
                          {textChannels.map(c => (
                            <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSendDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSend} disabled={!sendChannelId || sendEmbed.isPending}>
                      {sendEmbed.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Send Now
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Embed
            </Button>
          </div>
        </div>

        {(!isNew && isEmbedLoading) ? (
          <div className="p-8">
            <Skeleton className="w-full h-96 rounded-xl" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left side: Editor */}
            <ScrollArea className="flex-1 border-r border-border bg-background">
              <div className="p-6 md:p-8 max-w-3xl space-y-8">
                
                <section className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-border pb-2">General Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="embed-name">Internal Name <span className="text-destructive">*</span></Label>
                      <Input id="embed-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rules Embed" />
                      <p className="text-xs text-muted-foreground">Used to identify this embed in the dashboard.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="embed-color">Side Color</Label>
                      <div className="flex gap-2">
                        <Input id="embed-color" type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 p-1 px-2 h-10 cursor-pointer" />
                        <Input value={color} onChange={e => setColor(e.target.value)} placeholder="#000000" className="font-mono uppercase flex-1" />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-border pb-2">Author</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Author Name</Label>
                      <Input value={authorName} onChange={e => setAuthorName(e.target.value)} placeholder="Author name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Author URL</Label>
                      <Input value={authorUrl} onChange={e => setAuthorUrl(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Author Icon URL</Label>
                      <Input value={authorIconUrl} onChange={e => setAuthorIconUrl(e.target.value)} placeholder="https://..." />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-border pb-2">Body</h3>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Embed Title" />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        placeholder="Main content of the embed..." 
                        className="min-h-[150px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Supports markdown: **bold**, *italic*, __underline__, ~~strikethrough~~, `code`, and variables like {"{user}"}.</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="text-lg font-bold">Fields</h3>
                    <Button variant="outline" size="sm" onClick={handleAddField} disabled={fields.length >= 25}>
                      <Plus className="w-4 h-4 mr-2" /> Add Field
                    </Button>
                  </div>
                  
                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                      No fields added yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <Card key={index} className="border-border">
                          <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between">
                            <span className="font-semibold text-sm">Field {index + 1}</span>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`inline-${index}`} className="text-xs font-normal">Inline</Label>
                                <Switch 
                                  id={`inline-${index}`} 
                                  checked={field.inline} 
                                  onCheckedChange={c => handleUpdateField(index, 'inline', c)} 
                                />
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveField(index)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 space-y-3">
                            <div className="space-y-1">
                              <Input 
                                value={field.name} 
                                onChange={e => handleUpdateField(index, 'name', e.target.value)} 
                                placeholder="Field Name" 
                                className="font-semibold"
                              />
                            </div>
                            <div className="space-y-1">
                              <Textarea 
                                value={field.value} 
                                onChange={e => handleUpdateField(index, 'value', e.target.value)} 
                                placeholder="Field Value" 
                                rows={2}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-bold border-b border-border pb-2">Images</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Thumbnail URL</Label>
                      <Input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://... (small image in top right)" />
                    </div>
                    <div className="space-y-2">
                      <Label>Main Image URL</Label>
                      <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://... (large image at bottom)" />
                    </div>
                  </div>
                </section>

                <section className="space-y-4 pb-20">
                  <h3 className="text-lg font-bold border-b border-border pb-2">Footer</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Footer Text</Label>
                      <Input value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Footer text..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Footer Icon URL</Label>
                      <Input value={footerIconUrl} onChange={e => setFooterIconUrl(e.target.value)} placeholder="https://..." />
                    </div>
                  </div>
                </section>

              </div>
            </ScrollArea>

            {/* Right side: Live Preview */}
            <div className="w-full lg:w-[450px] xl:w-[550px] bg-secondary/30 p-6 flex flex-col relative z-0">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Palette className="w-4 h-4" /> Live Preview
              </h3>
              
              <div className="bg-[#313338] rounded-md p-4 text-[#dbdee1] flex gap-4 max-w-full overflow-hidden shadow-xl border border-black/20">
                {/* Avatar Placeholder */}
                <div className="w-10 h-10 rounded-full bg-[#1e1f22] flex-shrink-0 mt-1 flex items-center justify-center">
                   <div className="w-6 h-6 rounded-full bg-[#5865F2]"></div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">NexusBot</span>
                    <span className="text-xs bg-[#5865F2] text-white px-1.5 py-0.5 rounded-[3px] font-semibold flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.4 1.6L5.6 4H3C2.45 4 2 4.45 2 5V13C2 13.55 2.45 14 3 14H13C13.55 14 14 13.55 14 13V5C14 4.45 13.55 4 13 4H10.4L8.6 1.6H7.4ZM8 12C6.34 12 5 10.66 5 9C5 7.34 6.34 6 8 6C9.66 6 11 7.34 11 9C11 10.66 9.66 12 8 12ZM8 7.2C7.01 7.2 6.2 8.01 6.2 9C6.2 9.99 7.01 10.8 8 10.8C8.99 10.8 9.8 9.99 9.8 9C9.8 8.01 8.99 7.2 8 7.2Z" fill="currentColor"/></svg>
                      APP
                    </span>
                    <span className="text-xs text-[#949ba4]">Today at 12:00 PM</span>
                  </div>

                  {/* Embed Container */}
                  <div 
                    className="mt-2 bg-[#2b2d31] rounded-[4px] overflow-hidden max-w-full inline-block border-y border-r border-[#1e1f22]"
                    style={{ borderLeft: `4px solid ${color || '#202225'}` }}
                  >
                    <div className="p-4 flex flex-col gap-2 max-w-[432px]">
                      
                      {/* Author */}
                      {(authorName || authorIconUrl) && (
                        <div className="flex items-center gap-2 mb-1">
                          {authorIconUrl && (
                            <img src={authorIconUrl} alt="" className="w-6 h-6 rounded-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          )}
                          {authorName && (
                            <span className="font-semibold text-sm text-white">{formatTextWithVariables(authorName)}</span>
                          )}
                        </div>
                      )}

                      <div className="flex gap-4">
                        <div className="flex-1 min-w-0 flex flex-col gap-2">
                          {/* Title */}
                          {title && (
                            <div className="font-bold text-base text-white break-words">
                              {formatTextWithVariables(title)}
                            </div>
                          )}

                          {/* Description */}
                          {description && (
                            <div className="text-sm whitespace-pre-wrap break-words leading-tight">
                              {formatTextWithVariables(description)}
                            </div>
                          )}

                          {/* Fields */}
                          {fields.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-4">
                              {fields.map((field, i) => (
                                <div key={i} className={`flex flex-col gap-1 ${field.inline ? 'min-w-[120px] max-w-[200px] flex-1' : 'w-full'}`}>
                                  <div className="font-semibold text-sm text-white break-words">{formatTextWithVariables(field.name) || '\u200B'}</div>
                                  <div className="text-sm break-words leading-tight">{formatTextWithVariables(field.value) || '\u200B'}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Thumbnail */}
                        {thumbnailUrl && (
                          <div className="flex-shrink-0">
                            <img src={thumbnailUrl} alt="" className="max-w-[80px] max-h-[80px] rounded object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          </div>
                        )}
                      </div>

                      {/* Main Image */}
                      {imageUrl && (
                        <div className="mt-2 rounded overflow-hidden">
                          <img src={imageUrl} alt="" className="max-w-[400px] w-full max-h-[300px] object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                      )}

                      {/* Footer */}
                      {(footerText || footerIconUrl) && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#1e1f22]/50">
                          {footerIconUrl && (
                            <img src={footerIconUrl} alt="" className="w-5 h-5 rounded-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                          )}
                          {footerText && (
                            <span className="text-xs text-[#949ba4] font-medium">{formatTextWithVariables(footerText)}</span>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <Card className="bg-card/50 border-border">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Variables Available</h4>
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded border border-border">{"{user}"} <span className="text-muted-foreground opacity-70">@JohnDoe</span></div>
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded border border-border">{"{username}"} <span className="text-muted-foreground opacity-70">JohnDoe</span></div>
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded border border-border">{"{server}"} <span className="text-muted-foreground opacity-70">Nexus Gaming</span></div>
                      <div className="px-2 py-1 bg-secondary text-secondary-foreground rounded border border-border">{"{memberCount}"} <span className="text-muted-foreground opacity-70">1,234</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}