import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth-provider";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Guilds from "@/pages/guilds";
import GuildOverview from "@/pages/guild-overview";
import GuildWelcome from "@/pages/guild-welcome";
import GuildGoodbye from "@/pages/guild-goodbye";
import GuildModeration from "@/pages/guild-moderation";
import GuildLogging from "@/pages/guild-logging";
import GuildAutoRole from "@/pages/guild-autorole";
import GuildAntiSpam from "@/pages/guild-antispam";
import GuildReactionRoles from "@/pages/guild-reactionroles";
import GuildEmbeds from "@/pages/guild-embeds";
import GuildEmbedEditor from "@/pages/guild-embed-editor";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/guilds" component={Guilds} />
      <Route path="/guild/:guildId" component={GuildOverview} />
      <Route path="/guild/:guildId/welcome" component={GuildWelcome} />
      <Route path="/guild/:guildId/goodbye" component={GuildGoodbye} />
      <Route path="/guild/:guildId/moderation" component={GuildModeration} />
      <Route path="/guild/:guildId/logging" component={GuildLogging} />
      <Route path="/guild/:guildId/autorole" component={GuildAutoRole} />
      <Route path="/guild/:guildId/antispam" component={GuildAntiSpam} />
      <Route path="/guild/:guildId/reactionroles" component={GuildReactionRoles} />
      
      {/* Important: Put /new before /:embedId so it matches correctly */}
      <Route path="/guild/:guildId/embeds/new" component={GuildEmbedEditor} />
      <Route path="/guild/:guildId/embeds/:embedId" component={GuildEmbedEditor} />
      <Route path="/guild/:guildId/embeds" component={GuildEmbeds} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
