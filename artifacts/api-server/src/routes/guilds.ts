/**
 * Guild routes — fetch guilds and their channels/roles.
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  fetchUserGuilds,
  filterManageableGuilds,
  fetchGuildChannels,
  fetchGuildRoles,
  fetchGuildInfo,
} from "../lib/discordApi";
import { discordClient } from "../lib/discordBot";

const router: IRouter = Router();

// GET /api/guilds — list guilds the user manages
router.get("/guilds", requireAuth, async (req, res): Promise<void> => {
  const accessToken = (req as any).accessToken;
  try {
    const rawGuilds = await fetchUserGuilds(accessToken);
    const manageable = filterManageableGuilds(rawGuilds);

    const guilds = manageable.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      botPresent: discordClient.guilds.cache.has(g.id),
      memberCount: null as number | null,
    }));

    res.json(guilds);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch guilds");
    res.status(500).json({ error: "Failed to fetch guilds" });
  }
});

// GET /api/guilds/:guildId — get a specific guild
router.get("/guilds/:guildId", requireAuth, async (req, res): Promise<void> => {
  const rawGuildId = Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId;
  const guildId = String(rawGuildId);
  const accessToken = (req as any).accessToken;

  try {
    // Verify user has access to this guild
    const rawGuilds = await fetchUserGuilds(accessToken);
    const manageable = filterManageableGuilds(rawGuilds);
    const guild = manageable.find((g) => g.id === guildId);

    if (!guild) {
      res.status(404).json({ error: "Guild not found or access denied" });
      return;
    }

    // Get additional info from bot (member count etc.)
    const guildInfo = await fetchGuildInfo(guildId);

    res.json({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      botPresent: discordClient.guilds.cache.has(guildId),
      memberCount: guildInfo?.approximate_member_count ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch guild");
    res.status(500).json({ error: "Failed to fetch guild" });
  }
});

// GET /api/guilds/:guildId/channels
router.get("/guilds/:guildId/channels", requireAuth, async (req, res): Promise<void> => {
  const rawGuildId = Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId;
  const guildId = String(rawGuildId);

  try {
    const channels = await fetchGuildChannels(guildId);
    // Filter to text channels only (type 0 = GUILD_TEXT, type 5 = GUILD_ANNOUNCEMENT)
    const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);
    res.json(textChannels);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch channels");
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

// GET /api/guilds/:guildId/roles
router.get("/guilds/:guildId/roles", requireAuth, async (req, res): Promise<void> => {
  const rawGuildId = Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId;
  const guildId = String(rawGuildId);

  try {
    const roles = await fetchGuildRoles(guildId);
    // Filter out @everyone
    const filteredRoles = roles.filter((r) => r.name !== "@everyone");
    res.json(filteredRoles);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch roles");
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

export default router;
