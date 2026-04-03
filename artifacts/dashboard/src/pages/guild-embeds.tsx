import { useGetEmbeds, useDeleteEmbed, getGetEmbedsQueryKey } from "@workspace/api-client-react";
import { Link, useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function GuildEmbeds() {
  const { guildId } = useParams<{ guildId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: embeds, isLoading } = useGetEmbeds(guildId || "", {
    query: { enabled: !!guildId, queryKey: getGetEmbedsQueryKey(guildId || "") }
  });

  const deleteEmbed = useDeleteEmbed();

  const handleDelete = (embedId: string) => {
    if (!guildId) return;

    deleteEmbed.mutate({
      guildId,
      embedId
    }, {
      onSuccess: () => {
        toast({
          title: "Embed deleted",
          description: "The embed has been removed.",
        });
        queryClient.invalidateQueries({ queryKey: getGetEmbedsQueryKey(guildId) });
      },
      onError: (error) => {
        toast({
          title: "Error deleting embed",
          description: error.error || "An unexpected error occurred.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight mb-2">Embeds</h1>
            <p className="text-muted-foreground">Create and manage custom rich messages.</p>
          </div>
          <Link href={`/guild/${guildId}/embeds/new`}>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Create New Embed
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : embeds && embeds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {embeds.map((embed) => (
              <Card key={embed.id} className="overflow-hidden border-border flex flex-col group transition-all hover:border-primary/50">
                <div className="h-2 w-full" style={{ backgroundColor: embed.color || '#202225' }} />
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="mb-4 flex-1">
                    <h3 className="font-bold text-lg mb-1 truncate" title={embed.name}>{embed.name}</h3>
                    {embed.title && <p className="text-sm font-medium text-foreground truncate" title={embed.title}>{embed.title}</p>}
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {embed.description || "No description"}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(embed.updatedAt), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link href={`/guild/${guildId}/embeds/${embed.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the embed "{embed.name}". It cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(embed.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 border-2 border-dashed border-border rounded-xl bg-card/50">
            <Layers className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-bold mb-2">No embeds found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">Create beautiful rich messages to send to your channels or use in welcome messages.</p>
            <Link href={`/guild/${guildId}/embeds/new`}>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Create Your First Embed
              </Button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}