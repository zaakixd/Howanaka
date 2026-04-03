/**
 * Embed design routes — CRUD for embed designs + sending via bot.
 */
import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import { EmbedDesignModel, formatEmbed } from "../models/EmbedDesign";
import { discordClient } from "../lib/discordBot";
import { EmbedBuilder } from "discord.js";
import { fetchUserGuilds, filterManageableGuilds } from "../lib/discordApi";

const router: IRouter = Router();

// Helper to verify guild access
async function verifyGuildAccess(accessToken: string, guildId: string): Promise<boolean> {
  try {
    const rawGuilds = await fetchUserGuilds(accessToken);
    const manageable = filterManageableGuilds(rawGuilds);
    return manageable.some((g) => g.id === guildId);
  } catch {
    return false;
  }
}

// GET /api/guilds/:guildId/embeds
router.get("/guilds/:guildId/embeds", requireAuth, async (req, res): Promise<void> => {
  const guildId = String(Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId);
  const accessToken = (req as any).accessToken;

  if (!(await verifyGuildAccess(accessToken, guildId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const embeds = await EmbedDesignModel.find({ guildId }).sort({ createdAt: -1 });
    res.json(embeds.map((e) => formatEmbed(e as any)));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch embeds");
    res.status(500).json({ error: "Failed to fetch embeds" });
  }
});

// POST /api/guilds/:guildId/embeds
router.post("/guilds/:guildId/embeds", requireAuth, async (req, res): Promise<void> => {
  const guildId = String(Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId);
  const accessToken = (req as any).accessToken;

  if (!(await verifyGuildAccess(accessToken, guildId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const embed = await EmbedDesignModel.create({ ...req.body, guildId });
    res.status(201).json(formatEmbed(embed as any));
  } catch (err) {
    req.log.error({ err }, "Failed to create embed");
    res.status(500).json({ error: "Failed to create embed" });
  }
});

// GET /api/guilds/:guildId/embeds/:embedId
router.get("/guilds/:guildId/embeds/:embedId", requireAuth, async (req, res): Promise<void> => {
  const guildId = String(Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId);
  const embedId = String(Array.isArray(req.params.embedId) ? req.params.embedId[0] : req.params.embedId);
  const accessToken = (req as any).accessToken;

  if (!(await verifyGuildAccess(accessToken, guildId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const embed = await EmbedDesignModel.findOne({ _id: embedId, guildId });
    if (!embed) {
      res.status(404).json({ error: "Embed not found" });
      return;
    }
    res.json(formatEmbed(embed as any));
  } catch (err) {
    req.log.error({ err }, "Failed to get embed");
    res.status(500).json({ error: "Failed to get embed" });
  }
});

// PUT /api/guilds/:guildId/embeds/:embedId
router.put("/guilds/:guildId/embeds/:embedId", requireAuth, async (req, res): Promise<void> => {
  const guildId = String(Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId);
  const embedId = String(Array.isArray(req.params.embedId) ? req.params.embedId[0] : req.params.embedId);
  const accessToken = (req as any).accessToken;

  if (!(await verifyGuildAccess(accessToken, guildId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const embed = await EmbedDesignModel.findOneAndUpdate(
      { _id: embedId, guildId },
      { $set: req.body },
      { new: true },
    );
    if (!embed) {
      res.status(404).json({ error: "Embed not found" });
      return;
    }
    res.json(formatEmbed(embed as any));
  } catch (err) {
    req.log.error({ err }, "Failed to update embed");
    res.status(500).json({ error: "Failed to update embed" });
  }
});

// DELETE /api/guilds/:guildId/embeds/:embedId
router.delete("/guilds/:guildId/embeds/:embedId", requireAuth, async (req, res): Promise<void> => {
  const guildId = String(Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId);
  const embedId = String(Array.isArray(req.params.embedId) ? req.params.embedId[0] : req.params.embedId);
  const accessToken = (req as any).accessToken;

  if (!(await verifyGuildAccess(accessToken, guildId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  try {
    const result = await EmbedDesignModel.findOneAndDelete({ _id: embedId, guildId });
    if (!result) {
      res.status(404).json({ error: "Embed not found" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Failed to delete embed");
    res.status(500).json({ error: "Failed to delete embed" });
  }
});

// POST /api/guilds/:guildId/embeds/:embedId/send
router.post("/guilds/:guildId/embeds/:embedId/send", requireAuth, async (req, res): Promise<void> => {
  const guildId = String(Array.isArray(req.params.guildId) ? req.params.guildId[0] : req.params.guildId);
  const embedId = String(Array.isArray(req.params.embedId) ? req.params.embedId[0] : req.params.embedId);
  const { channelId } = req.body as { channelId?: string };
  const accessToken = (req as any).accessToken;

  if (!(await verifyGuildAccess(accessToken, guildId))) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  if (!channelId) {
    res.status(400).json({ error: "channelId is required" });
    return;
  }

  try {
    const design = await EmbedDesignModel.findOne({ _id: embedId, guildId });
    if (!design) {
      res.status(404).json({ error: "Embed not found" });
      return;
    }

    const channel = discordClient.channels.cache.get(channelId) as any;
    if (!channel) {
      res.status(400).json({ error: "Channel not found or bot not in guild" });
      return;
    }

    const discordEmbed = new EmbedBuilder();
    if (design.color) discordEmbed.setColor(parseInt(design.color.replace(/^#/, ""), 16) as any);
    if (design.title) discordEmbed.setTitle(design.title);
    if (design.description) discordEmbed.setDescription(design.description);
    if (design.thumbnailUrl) discordEmbed.setThumbnail(design.thumbnailUrl);
    if (design.imageUrl) discordEmbed.setImage(design.imageUrl);
    if (design.footerText) discordEmbed.setFooter({ text: design.footerText, iconURL: design.footerIconUrl ?? undefined });
    if (design.authorName) discordEmbed.setAuthor({ name: design.authorName, iconURL: design.authorIconUrl ?? undefined, url: design.authorUrl ?? undefined });
    for (const field of design.fields ?? []) {
      discordEmbed.addFields({ name: field.name, value: field.value, inline: field.inline ?? false });
    }

    await channel.send({ embeds: [discordEmbed] });

    res.json({ message: "Embed sent successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to send embed");
    res.status(500).json({ error: "Failed to send embed" });
  }
});

export default router;
