/**
 * Guild configuration routes — get and update guild settings.
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { getOrCreateGuildConfig } from "../models/GuildConfig";
import {
  fetchUserGuilds,
  filterManageableGuilds,
} from "../lib/discordApi";

const router: IRouter = Router();

// Helper to verify user has access to a guild
async function verifyGuildAccess(accessToken: string, guildId: string): Promise<boolean> {
  try {
    const rawGuilds = await fetchUserGuilds(accessToken);
    const manageable = filterManageableGuilds(rawGuilds);
    return manageable.some((g) => g.id === guildId);
  } catch {
    return false;
  }
}

// Helper to format config document to API shape
function formatConfig(config: any) {
  return {
    guildId: config.guildId,
    prefix: config.prefix,
    welcome: {
      enabled: config.welcome.enabled,
      channelId: config.welcome.channelId ?? null,
      message: config.welcome.message ?? null,
      embedId: config.welcome.embedId ?? null,
    },
    goodbye: {
      enabled: config.goodbye.enabled,
      channelId: config.goodbye.channelId ?? null,
      message: config.goodbye.message ?? null,
      embedId: config.goodbye.embedId ?? null,
    },
    moderation: {
      enabled: config.moderation.enabled,
      logChannelId: config.moderation.logChannelId ?? null,
      muteRoleId: config.moderation.muteRoleId ?? null,
    },
    logging: {
      enabled: config.logging.enabled,
      channelId: config.logging.channelId ?? null,
      logJoins: config.logging.logJoins,
      logLeaves: config.logging.logLeaves,
      logMessageDeletes: config.logging.logMessageDeletes,
      logMessageEdits: config.logging.logMessageEdits,
      logModActions: config.logging.logModActions,
    },
    autoRole: {
      enabled: config.autoRole.enabled,
      roleIds: config.autoRole.roleIds ?? [],
    },
    antiSpam: {
      enabled: config.antiSpam.enabled,
      maxMessages: config.antiSpam.maxMessages,
      timeWindowSeconds: config.antiSpam.timeWindowSeconds,
      action: config.antiSpam.action,
    },
    reactionRoles: {
      enabled: config.reactionRoles.enabled,
      items: config.reactionRoles.items ?? [],
    },
    updatedAt: config.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

// GET /api/guilds/:guildId/config
router.get("/guilds/:guildId/config", requireAuth, async (req, res): Promise<void> => {
  const rawGuildId = Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId;
  const guildId = String(rawGuildId);
  const accessToken = (req as any).accessToken;

  const hasAccess = await verifyGuildAccess(accessToken, guildId);
  if (!hasAccess) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const config = await getOrCreateGuildConfig(guildId);
    res.json(formatConfig(config));
  } catch (err) {
    req.log.error({ err }, "Failed to get guild config");
    res.status(500).json({ error: "Failed to get guild config" });
  }
});

// PUT /api/guilds/:guildId/config
router.put("/guilds/:guildId/config", requireAuth, async (req, res): Promise<void> => {
  const rawGuildId = Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId;
  const guildId = String(rawGuildId);
  const accessToken = (req as any).accessToken;

  const hasAccess = await verifyGuildAccess(accessToken, guildId);
  if (!hasAccess) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const config = await getOrCreateGuildConfig(guildId);
    const body = req.body;

    // Merge updates
    if (body.prefix != null) config.prefix = body.prefix;
    if (body.welcome != null) Object.assign(config.welcome, body.welcome);
    if (body.goodbye != null) Object.assign(config.goodbye, body.goodbye);
    if (body.moderation != null) Object.assign(config.moderation, body.moderation);
    if (body.logging != null) Object.assign(config.logging, body.logging);
    if (body.autoRole != null) Object.assign(config.autoRole, body.autoRole);
    if (body.antiSpam != null) Object.assign(config.antiSpam, body.antiSpam);
    if (body.reactionRoles != null) Object.assign(config.reactionRoles, body.reactionRoles);

    config.markModified("welcome");
    config.markModified("goodbye");
    config.markModified("moderation");
    config.markModified("logging");
    config.markModified("autoRole");
    config.markModified("antiSpam");
    config.markModified("reactionRoles");

    await config.save();

    req.log.info({ guildId }, "Guild config updated");
    res.json(formatConfig(config));
  } catch (err) {
    req.log.error({ err }, "Failed to update guild config");
    res.status(500).json({ error: "Failed to update guild config" });
  }
});

export default router;
