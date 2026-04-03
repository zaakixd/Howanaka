import { useGetGuildStats } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Layers, ShieldAlert, LogIn, LogOut, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export default function GuildOverview() {
  const { guildId } = useParams<{ guildId: string }>();
  const { data: stats, isLoading } = useGetGuildStats(guildId || "", {
    query: { enabled: !!guildId }
  });

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">Overview</h1>
          <p className="text-muted-foreground">Key metrics and recent activity for your server.</p>
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
            <Skeleton className="h-96 rounded-xl mt-8" />
          </>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Total Members" 
                value={stats.totalMembers.toLocaleString()} 
                icon={<Users className="w-5 h-5 text-blue-400" />} 
              />
              <StatCard 
                title="Saved Embeds" 
                value={stats.totalEmbeds.toLocaleString()} 
                icon={<Layers className="w-5 h-5 text-purple-400" />} 
              />
              <StatCard 
                title="Mod Actions" 
                value={stats.totalModActions.toLocaleString()} 
                icon={<ShieldAlert className="w-5 h-5 text-red-400" />} 
              />
              <div className="grid grid-cols-2 gap-4 col-span-1 sm:col-span-2 lg:col-span-1">
                <StatCard 
                  title="Joins Today" 
                  value={stats.totalJoinsToday.toLocaleString()} 
                  icon={<LogIn className="w-4 h-4 text-green-400" />} 
                  small
                />
                <StatCard 
                  title="Leaves Today" 
                  value={stats.totalLeavesToday.toLocaleString()} 
                  icon={<LogOut className="w-4 h-4 text-orange-400" />} 
                  small
                />
              </div>
            </div>

            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {stats.recentLogs.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {stats.recentLogs.map((log) => (
                      <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm capitalize">{log.type.replace(/_/g, ' ')}</span>
                            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                          </div>
                          <p className="text-sm text-foreground/80">{log.details}</p>
                        </div>
                        {log.userId && (
                          <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md self-start sm:self-auto whitespace-nowrap">
                            User ID: {log.userId}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No recent activity recorded.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="p-8 text-center text-destructive bg-destructive/10 rounded-xl">
            Failed to load guild statistics.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon, small = false }: { title: string, value: string, icon: React.ReactNode, small?: boolean }) {
  return (
    <Card className="border-border shadow-sm overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className={`p-5 flex flex-col justify-center h-full ${small ? 'gap-1' : 'gap-3'}`}>
        <div className="flex items-center gap-2 text-muted-foreground font-medium">
          {icon}
          <span className={small ? "text-xs" : "text-sm"}>{title}</span>
        </div>
        <div className={`font-extrabold text-foreground ${small ? "text-2xl" : "text-4xl"}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}