import { useGetGuild } from "@workspace/api-client-react";
import { Link, useLocation, useParams } from "wouter";
import { ProtectedRoute } from "@/components/protected-route";
import { 
  LayoutDashboard, 
  MessageSquare, 
  UserMinus, 
  ShieldAlert, 
  ScrollText, 
  UserPlus, 
  Zap, 
  SmilePlus, 
  Layers,
  ChevronLeft,
  Settings,
  Menu
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/welcome", label: "Welcome", icon: MessageSquare },
  { href: "/goodbye", label: "Goodbye", icon: UserMinus },
  { href: "/moderation", label: "Moderation", icon: ShieldAlert },
  { href: "/logging", label: "Logging", icon: ScrollText },
  { href: "/autorole", label: "Auto-role", icon: UserPlus },
  { href: "/antispam", label: "Anti-spam", icon: Zap },
  { href: "/reactionroles", label: "Reaction Roles", icon: SmilePlus },
  { href: "/embeds", label: "Embeds", icon: Layers },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { guildId } = useParams<{ guildId: string }>();
  const { data: guild, isLoading } = useGetGuild(guildId || "", {
    query: { enabled: !!guildId }
  });
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!guildId) return null;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 md:p-6 flex items-center gap-3 border-b border-border">
        <Link href="/guilds" className="p-2 -ml-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        {isLoading ? (
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-24 h-5" />
          </div>
        ) : guild ? (
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 rounded-xl border border-border shadow-sm">
              {guild.icon ? (
                <AvatarImage src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} className="rounded-xl object-cover" />
              ) : null}
              <AvatarFallback className="rounded-xl bg-secondary text-secondary-foreground font-bold">
                {guild.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-bold text-sm truncate max-w-[140px]" title={guild.name}>{guild.name}</span>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const path = `/guild/${guildId}${item.href}`;
          const isActive = location === path || (item.href !== "" && location.startsWith(path + "/"));
          
          return (
            <Link 
              key={item.href} 
              href={path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <Settings className="w-4 h-4" />
          <span>NexusBot v1.0.0</span>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 border-r border-border bg-card/30 flex-shrink-0 sticky top-0 h-[100dvh]">
          <NavContent />
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <NavContent />
              </SheetContent>
            </Sheet>
            {guild && (
              <span className="font-bold text-sm truncate max-w-[200px]">{guild.name}</span>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
