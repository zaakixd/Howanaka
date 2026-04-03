import { useAuth } from "@/components/auth-provider";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings2, ShieldCheck, Zap, Activity } from "lucide-react";

export default function Landing() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !isLoading) {
      setLocation("/guilds");
    }
  }, [user, isLoading, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/auth/discord";
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="px-6 py-6 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <Settings2 className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">NexusBot</span>
        </div>
        <Button onClick={handleLogin} className="rounded-full px-6 font-semibold shadow-md shadow-primary/20 transition-transform active:scale-95">
          Login with Discord
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium border border-border mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            System Operational
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-tight text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/60">
            The command center for <br className="hidden md:block" />
            Discord professionals.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Dense, powerful, and precise. Manage your server's welcome messages, moderation, logging, and custom embeds from a single professional control panel.
          </p>

          <div className="pt-8">
             <Button size="lg" onClick={handleLogin} className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 transition-transform active:scale-95">
                Go to Dashboard
             </Button>
          </div>
        </div>

        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto relative z-10 w-full">
          <FeatureCard 
            icon={<Activity className="w-8 h-8 text-primary" />}
            title="Complete Logging"
            description="Track every join, leave, message deletion, and mod action with precision."
          />
          <FeatureCard 
            icon={<ShieldCheck className="w-8 h-8 text-primary" />}
            title="Advanced Moderation"
            description="Automate muting, anti-spam, and role assignment to keep your community safe."
          />
          <FeatureCard 
            icon={<Zap className="w-8 h-8 text-primary" />}
            title="Visual Embed Editor"
            description="Craft perfect Discord embeds with a live preview before sending them to channels."
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-card-border shadow-lg shadow-black/5 flex flex-col items-center text-center gap-4 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
