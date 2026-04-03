/**
 * Stats and activity log routes for the dashboard.
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { ActivityLogModel, formatLog } from "../models/ActivityLog";
import { EmbedDesignModel } from "../models/EmbedDesign";
import { discordClient } from "../lib/discordBot";
import { fetchUserGuilds, filterManageableGuilds } from "../lib/discordApi";

const router: IRouter = Router();

async function verifyGuildAccess(accessToken: string, guildId: string): Promise<boolean> {
  try {
    const rawGuilds = await fetchUserGuilds(accessToken);
    const manageable = filterManageableGuilds(rawGuilds);
    return manageable.some((g) => g.id === guildId);
  } catch {
    return false;
  }
}

// GET /api/guilds/:guildId/logs
router.get("/guilds/:guildId/logs", requireAuth, async (req, res): Promise<void> => {
  const guildId = String(Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId);
  const accessToken = (req as any).accessToken;

  if (!(await verifyGuildAccess(accessToken, guildId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const limit = parseInt(String(req.query.limit ?? "50"), 10);
  const type = req.query.type ? String(req.query.type) : undefined;

  try {
    const query: any = { guildId };
    if (type) query.type = type;

    const logs = await ActivityLogModel.find(query)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200));

    res.json(logs.map((l) => formatLog(l as any)));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch logs");
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// GET /api/guilds/:guildId/stats
router.get("/guilds/:guildId/stats", requireAuth, async (req, res): Promise<void> => {
  const guildId = String(Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId);
  const accessToken = (req as any).accessToken;

  if (!(await verifyGuildAccess(accessToken, guildId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    // Get today's start timestamp
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalEmbeds,
      totalModActions,
      totalJoinsToday,
      totalLeavesToday,
      recentLogs,
    ] = await Promise.all([
      EmbedDesignModel.countDocuments({ guildId }),
      ActivityLogModel.countDocuments({
        guildId,
        type: { $in: ["mod_ban", "mod_kick", "mod_mute", "mod_warn"] },
      }),
      ActivityLogModel.countDocuments({
        guildId,
        type: "member_join",
        createdAt: { $gte: todayStart },
      }),
      ActivityLogModel.countDocuments({
        guildId,
        type: "member_leave",
        createdAt: { $gte: todayStart },
      }),
      ActivityLogModel.find({ guildId }).sort({ createdAt: -1 }).limit(10),
    ]);

    // Get member count from Discord bot cache
    const guild = discordClient.guilds.cache.get(guildId);
    const totalMembers = guild?.memberCount ?? 0;

    res.json({
      guildId,
      totalMembers,
      totalEmbeds,
      totalModActions,
      totalJoinsToday,
      totalLeavesToday,
      recentLogs: recentLogs.map((l) => formatLog(l as any)),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
