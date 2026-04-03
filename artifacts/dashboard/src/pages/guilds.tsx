import { useGetGuilds } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-provider";
import { LogOut, Plus, Server, LayoutDashboard } from "lucide-react";
import { useLogout } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Guilds() {
  return (
    <ProtectedRoute>
      <GuildsContent />
    </ProtectedRoute>
  );
}

function GuildsContent() {
  const { data: guilds, isLoading } = useGetGuilds();
  const { user } = useAuth();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/";
      }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">NexusBot</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pr-4 border-r border-border">
            <Avatar className="w-8 h-8 border border-border">
              {user?.avatar ? (
                 <AvatarImage src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} />
              ) : null}
              <AvatarFallback className="bg-secondary text-secondary-foreground">{user?.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user?.username}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">Select a Server</h1>
            <p className="text-muted-foreground text-lg">Choose a server to manage its settings and configurations.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : guilds?.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-border rounded-xl bg-card/50">
            <Server className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">No servers found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">You don't manage any servers yet, or you haven't granted the necessary permissions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guilds?.map((guild) => (
              <GuildCard key={guild.id} guild={guild} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function GuildCard({ guild }: { guild: any }) {
  const isPresent = guild.botPresent;
  
  return (
    <div className={`p-6 rounded-xl border flex flex-col gap-6 transition-all duration-200 ${isPresent ? 'bg-card border-card-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5' : 'bg-muted/30 border-border opacity-75 grayscale-[0.5]'}`}>
      <div className="flex items-start justify-between gap-4">
        <Avatar className="w-16 h-16 rounded-xl border border-border shadow-sm">
          {guild.icon ? (
            <AvatarImage src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} className="rounded-xl object-cover" />
          ) : null}
          <AvatarFallback className="rounded-xl bg-secondary text-secondary-foreground font-bold text-xl">
            {guild.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {!isPresent && (
          <div className="px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold border border-border">
            Setup Required
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-xl font-bold truncate" title={guild.name}>{guild.name}</h3>
        {guild.memberCount && (
           <p className="text-sm text-muted-foreground mt-1">{guild.memberCount.toLocaleString()} members</p>
        )}
      </div>
      
      <div className="mt-auto pt-2">
        {isPresent ? (
          <Link href={`/guild/${guild.id}`} className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-lg font-medium transition-colors">
             Manage Server
          </Link>
        ) : (
          <Button variant="secondary" className="w-full h-10 font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Invite Bot
          </Button>
        )}
      </div>
    </div>
  );
}