/**
 * Discord Bot client singleton.
 * The bot connects to Discord and handles guild events, slash commands,
 * moderation commands, welcome/goodbye, auto-roles, logging, and anti-spam.
 */
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  EmbedBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  Message,
  TextChannel,
  ChannelType,
} from "discord.js";
import { logger } from "./logger";
import { getOrCreateGuildConfig } from "../models/GuildConfig";
import { EmbedDesignModel } from "../models/EmbedDesign";
import { ActivityLogModel } from "../models/ActivityLog";

// Create the Discord client with required intents
export const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Anti-spam tracker: guildId -> userId -> { count, timer }
const spamTracker = new Map<string, Map<string, { count: number; timer: NodeJS.Timeout }>>();

// Variable substitution for welcome/goodbye messages
function substituteVars(text: string, member: GuildMember): string {
  return text
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, String(member.guild.memberCount))
    .replace(/{userAvatar}/g, member.user.displayAvatarURL());
}

// Parse a color string like "#5865F2" or "0x5865F2" to an integer
function parseColor(color: string | null): number {
  if (!color) return 0x5865f2;
  const hex = color.replace(/^#/, "").replace(/^0x/i, "");
  return parseInt(hex, 16) || 0x5865f2;
}

// Build a Discord embed from our embed design + member context
async function buildEmbed(embedId: string, member?: GuildMember): Promise<EmbedBuilder | null> {
  const design = await EmbedDesignModel.findById(embedId);
  if (!design) return null;

  const embed = new EmbedBuilder();

  if (design.color) embed.setColor(parseColor(design.color));
  if (design.title) {
    const title = member ? substituteVars(design.title, member) : design.title;
    embed.setTitle(title);
  }
  if (design.description) {
    const desc = member ? substituteVars(design.description, member) : design.description;
    embed.setDescription(desc);
  }
  if (design.thumbnailUrl) embed.setThumbnail(design.thumbnailUrl);
  if (design.imageUrl) embed.setImage(design.imageUrl);
  if (design.footerText) {
    embed.setFooter({ text: design.footerText, iconURL: design.footerIconUrl ?? undefined });
  }
  if (design.authorName) {
    embed.setAuthor({
      name: design.authorName,
      iconURL: design.authorIconUrl ?? undefined,
      url: design.authorUrl ?? undefined,
    });
  }
  for (const field of design.fields ?? []) {
    embed.addFields({ name: field.name, value: field.value, inline: field.inline ?? false });
  }

  return embed;
}

// Log an activity to MongoDB
async function logActivity(
  guildId: string,
  type: string,
  details: string,
  userId?: string,
  targetId?: string,
) {
  try {
    await ActivityLogModel.create({ guildId, type, details, userId, targetId });
  } catch (err) {
    logger.warn({ err }, "Failed to write activity log");
  }
}

// ─── MEMBER JOIN ─────────────────────────────────────────────────────────────
discordClient.on(Events.GuildMemberAdd, async (member) => {
  const config = await getOrCreateGuildConfig(member.guild.id);

  // Auto-role assignment
  if (config.autoRole.enabled && config.autoRole.roleIds.length > 0) {
    for (const roleId of config.autoRole.roleIds) {
      try {
        await member.roles.add(roleId);
      } catch (err) {
        logger.warn({ err, roleId }, "Failed to assign auto-role");
      }
    }
  }

  // Welcome message
  if (config.welcome.enabled && config.welcome.channelId) {
    try {
      const channel = member.guild.channels.cache.get(config.welcome.channelId) as TextChannel;
      if (channel) {
        if (config.welcome.embedId) {
          const embed = await buildEmbed(config.welcome.embedId, member);
          if (embed) {
            await channel.send({ embeds: [embed] });
          }
        } else if (config.welcome.message) {
          await channel.send(substituteVars(config.welcome.message, member));
        }
      }
    } catch (err) {
      logger.warn({ err }, "Failed to send welcome message");
    }
  }

  // Logging
  if (config.logging.enabled && config.logging.logJoins && config.logging.channelId) {
    try {
      const logChannel = member.guild.channels.cache.get(config.logging.channelId) as TextChannel;
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle("Member Joined")
          .setDescription(`<@${member.id}> joined the server`)
          .addFields(
            { name: "User", value: member.user.tag, inline: true },
            { name: "ID", value: member.id, inline: true },
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.warn({ err }, "Failed to send join log");
    }
  }

  await logActivity(member.guild.id, "member_join", `${member.user.tag} joined the server`, member.id);
});

// ─── MEMBER LEAVE ────────────────────────────────────────────────────────────
discordClient.on(Events.GuildMemberRemove, async (member) => {
  const config = await getOrCreateGuildConfig(member.guild.id);

  // Goodbye message
  if (config.goodbye.enabled && config.goodbye.channelId) {
    try {
      const channel = member.guild.channels.cache.get(config.goodbye.channelId) as TextChannel;
      if (channel && member instanceof GuildMember) {
        if (config.goodbye.embedId) {
          const embed = await buildEmbed(config.goodbye.embedId, member);
          if (embed) await channel.send({ embeds: [embed] });
        } else if (config.goodbye.message) {
          await channel.send(substituteVars(config.goodbye.message, member));
        }
      }
    } catch (err) {
      logger.warn({ err }, "Failed to send goodbye message");
    }
  }

  // Logging
  if (config.logging.enabled && config.logging.logLeaves && config.logging.channelId) {
    try {
      const logChannel = member.guild.channels.cache.get(config.logging.channelId) as TextChannel;
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Member Left")
          .setDescription(`**${member.user?.tag ?? "Unknown"}** left the server`)
          .addFields({ name: "ID", value: member.id, inline: true })
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.warn({ err }, "Failed to send leave log");
    }
  }

  await logActivity(
    member.guild.id,
    "member_leave",
    `${member.user?.tag ?? member.id} left the server`,
    member.id,
  );
});

// ─── MESSAGE CREATE (prefix commands + anti-spam) ─────────────────────────────
discordClient.on(Events.MessageCreate, async (message: Message) => {
  if (!message.guild || message.author.bot) return;

  const config = await getOrCreateGuildConfig(message.guild.id);

  // ── Anti-spam ──
  if (config.antiSpam.enabled) {
    const guildMap = spamTracker.get(message.guild.id) ?? new Map();
    const userEntry = guildMap.get(message.author.id) ?? { count: 0, timer: null as any };

    userEntry.count += 1;

    if (userEntry.timer) clearTimeout(userEntry.timer);
    userEntry.timer = setTimeout(() => {
      const g = spamTracker.get(message.guild.id);
      if (g) g.delete(message.author.id);
    }, config.antiSpam.timeWindowSeconds * 1000);

    if (userEntry.count >= config.antiSpam.maxMessages) {
      const member = message.member;
      if (member) {
        try {
          const action = config.antiSpam.action;
          if (action === "warn") {
            await message.channel.send(`<@${member.id}> Please slow down!`);
          } else if (action === "mute" && config.moderation.muteRoleId) {
            await member.roles.add(config.moderation.muteRoleId);
            await message.channel.send(`<@${member.id}> has been muted for spamming.`);
          } else if (action === "kick") {
            await member.kick("Anti-spam");
          } else if (action === "ban") {
            await member.ban({ reason: "Anti-spam" });
          }
          await logActivity(
            message.guild.id,
            "anti_spam",
            `Anti-spam triggered for ${message.author.tag} (action: ${action})`,
            message.author.id,
          );
          guildMap.delete(message.author.id);
        } catch (err) {
          logger.warn({ err }, "Anti-spam action failed");
        }
      }
    }

    guildMap.set(message.author.id, userEntry);
    spamTracker.set(message.guild.id, guildMap);
  }

  // ── Prefix commands ──
  const prefix = config.prefix || "!";
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (!command) return;

  // Permission check helper
  const hasPermission = (perm: bigint) =>
    message.member?.permissions.has(perm) ?? false;

  try {
    switch (command) {
      case "ban": {
        if (!hasPermission(PermissionFlagsBits.BanMembers)) {
          await message.reply("You don't have permission to ban members.");
          return;
        }
        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply("Please mention a member to ban.");
          return;
        }
        const reason = args.slice(1).join(" ") || "No reason provided";
        await target.ban({ reason });
        await message.reply(`Banned **${target.user.tag}**. Reason: ${reason}`);
        await logActivity(
          message.guild.id,
          "mod_ban",
          `${target.user.tag} was banned by ${message.author.tag}. Reason: ${reason}`,
          message.author.id,
          target.id,
        );
        break;
      }
      case "kick": {
        if (!hasPermission(PermissionFlagsBits.KickMembers)) {
          await message.reply("You don't have permission to kick members.");
          return;
        }
        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply("Please mention a member to kick.");
          return;
        }
        const reason = args.slice(1).join(" ") || "No reason provided";
        await target.kick(reason);
        await message.reply(`Kicked **${target.user.tag}**. Reason: ${reason}`);
        await logActivity(
          message.guild.id,
          "mod_kick",
          `${target.user.tag} was kicked by ${message.author.tag}. Reason: ${reason}`,
          message.author.id,
          target.id,
        );
        break;
      }
      case "mute": {
        if (!hasPermission(PermissionFlagsBits.ModerateMembers)) {
          await message.reply("You don't have permission to mute members.");
          return;
        }
        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply("Please mention a member to mute.");
          return;
        }
        if (!config.moderation.muteRoleId) {
          await message.reply("No mute role configured. Set one in the dashboard.");
          return;
        }
        await target.roles.add(config.moderation.muteRoleId);
        await message.reply(`Muted **${target.user.tag}**.`);
        await logActivity(
          message.guild.id,
          "mod_mute",
          `${target.user.tag} was muted by ${message.author.tag}`,
          message.author.id,
          target.id,
        );
        break;
      }
      case "warn": {
        if (!hasPermission(PermissionFlagsBits.ModerateMembers)) {
          await message.reply("You don't have permission to warn members.");
          return;
        }
        const target = message.mentions.members?.first();
        if (!target) {
          await message.reply("Please mention a member to warn.");
          return;
        }
        const reason = args.slice(1).join(" ") || "No reason provided";
        try {
          await target.send(`You have been warned in **${message.guild.name}**. Reason: ${reason}`);
        } catch {
          // DMs disabled
        }
        await message.reply(`Warned **${target.user.tag}**. Reason: ${reason}`);
        await logActivity(
          message.guild.id,
          "mod_warn",
          `${target.user.tag} was warned by ${message.author.tag}. Reason: ${reason}`,
          message.author.id,
          target.id,
        );
        break;
      }
      default:
        break;
    }
  } catch (err) {
    logger.error({ err }, "Error handling prefix command");
    await message.reply("An error occurred while executing that command.");
  }
});

// ─── MESSAGE DELETE ───────────────────────────────────────────────────────────
discordClient.on(Events.MessageDelete, async (message) => {
  if (!message.guild || message.author?.bot) return;
  const config = await getOrCreateGuildConfig(message.guild.id);

  if (config.logging.enabled && config.logging.logMessageDeletes && config.logging.channelId) {
    try {
      const logChannel = message.guild.channels.cache.get(config.logging.channelId) as TextChannel;
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("Message Deleted")
          .addFields(
            { name: "Author", value: message.author?.tag ?? "Unknown", inline: true },
            { name: "Channel", value: `<#${message.channel.id}>`, inline: true },
            { name: "Content", value: message.content?.slice(0, 1024) || "*(no content)*" },
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.warn({ err }, "Failed to log message delete");
    }
  }
});

// ─── MESSAGE UPDATE ───────────────────────────────────────────────────────────
discordClient.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
  if (!newMsg.guild || newMsg.author?.bot) return;
  if (oldMsg.content === newMsg.content) return;

  const config = await getOrCreateGuildConfig(newMsg.guild.id);

  if (config.logging.enabled && config.logging.logMessageEdits && config.logging.channelId) {
    try {
      const logChannel = newMsg.guild.channels.cache.get(config.logging.channelId) as TextChannel;
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle("Message Edited")
          .addFields(
            { name: "Author", value: newMsg.author?.tag ?? "Unknown", inline: true },
            { name: "Channel", value: `<#${newMsg.channel.id}>`, inline: true },
            { name: "Before", value: oldMsg.content?.slice(0, 512) || "*(no content)*" },
            { name: "After", value: newMsg.content?.slice(0, 512) || "*(no content)*" },
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      logger.warn({ err }, "Failed to log message edit");
    }
  }
});

// ─── INTERACTION (slash commands) ─────────────────────────────────────────────
discordClient.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction as ChatInputCommandInteraction;

  if (!interaction.guild) {
    await cmd.reply({ content: "This command must be used in a server.", ephemeral: true });
    return;
  }

  const config = await getOrCreateGuildConfig(interaction.guild.id);
  const member = interaction.member as GuildMember;

  const hasPermission = (perm: bigint) =>
    member.permissions.has(perm);

  try {
    switch (cmd.commandName) {
      case "ban": {
        if (!hasPermission(PermissionFlagsBits.BanMembers)) {
          await cmd.reply({ content: "You don't have permission to ban members.", ephemeral: true });
          return;
        }
        const target = cmd.options.getMember("user") as GuildMember;
        const reason = cmd.options.getString("reason") ?? "No reason provided";
        if (!target) {
          await cmd.reply({ content: "User not found.", ephemeral: true });
          return;
        }
        await target.ban({ reason });
        await cmd.reply(`Banned **${target.user.tag}**. Reason: ${reason}`);
        await logActivity(
          interaction.guild.id,
          "mod_ban",
          `${target.user.tag} was banned by ${interaction.user.tag}. Reason: ${reason}`,
          interaction.user.id,
          target.id,
        );
        break;
      }
      case "kick": {
        if (!hasPermission(PermissionFlagsBits.KickMembers)) {
          await cmd.reply({ content: "You don't have permission to kick members.", ephemeral: true });
          return;
        }
        const target = cmd.options.getMember("user") as GuildMember;
        const reason = cmd.options.getString("reason") ?? "No reason provided";
        if (!target) {
          await cmd.reply({ content: "User not found.", ephemeral: true });
          return;
        }
        await target.kick(reason);
        await cmd.reply(`Kicked **${target.user.tag}**. Reason: ${reason}`);
        await logActivity(
          interaction.guild.id,
          "mod_kick",
          `${target.user.tag} was kicked by ${interaction.user.tag}. Reason: ${reason}`,
          interaction.user.id,
          target.id,
        );
        break;
      }
      case "mute": {
        if (!hasPermission(PermissionFlagsBits.ModerateMembers)) {
          await cmd.reply({ content: "You don't have permission to mute members.", ephemeral: true });
          return;
        }
        if (!config.moderation.muteRoleId) {
          await cmd.reply({ content: "No mute role configured. Set one in the dashboard.", ephemeral: true });
          return;
        }
        const target = cmd.options.getMember("user") as GuildMember;
        if (!target) {
          await cmd.reply({ content: "User not found.", ephemeral: true });
          return;
        }
        await target.roles.add(config.moderation.muteRoleId);
        await cmd.reply(`Muted **${target.user.tag}**.`);
        await logActivity(
          interaction.guild.id,
          "mod_mute",
          `${target.user.tag} was muted by ${interaction.user.tag}`,
          interaction.user.id,
          target.id,
        );
        break;
      }
      case "warn": {
        if (!hasPermission(PermissionFlagsBits.ModerateMembers)) {
          await cmd.reply({ content: "You don't have permission to warn members.", ephemeral: true });
          return;
        }
        const target = cmd.options.getMember("user") as GuildMember;
        const reason = cmd.options.getString("reason") ?? "No reason provided";
        if (!target) {
          await cmd.reply({ content: "User not found.", ephemeral: true });
          return;
        }
        try {
          await target.send(
            `You have been warned in **${interaction.guild.name}**. Reason: ${reason}`,
          );
        } catch {
          // DMs disabled
        }
        await cmd.reply(`Warned **${target.user.tag}**. Reason: ${reason}`);
        await logActivity(
          interaction.guild.id,
          "mod_warn",
          `${target.user.tag} was warned by ${interaction.user.tag}. Reason: ${reason}`,
          interaction.user.id,
          target.id,
        );
        break;
      }
      default:
        await cmd.reply({ content: "Unknown command.", ephemeral: true });
    }
  } catch (err) {
    logger.error({ err }, "Error handling slash command");
    if (!cmd.replied) {
      await cmd.reply({ content: "An error occurred.", ephemeral: true });
    }
  }
});

// ─── SLASH COMMAND REGISTRATION ──────────────────────────────────────────────
export async function registerSlashCommands(): Promise<void> {
  const token = process.env["DISCORD_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];
  if (!token || !clientId) {
    logger.warn("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID — skipping slash command registration");
    return;
  }

  const commands = [
    new SlashCommandBuilder()
      .setName("ban")
      .setDescription("Ban a member from the server")
      .addUserOption((o) => o.setName("user").setDescription("User to ban").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason for ban")),
    new SlashCommandBuilder()
      .setName("kick")
      .setDescription("Kick a member from the server")
      .addUserOption((o) => o.setName("user").setDescription("User to kick").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason for kick")),
    new SlashCommandBuilder()
      .setName("mute")
      .setDescription("Mute a member")
      .addUserOption((o) => o.setName("user").setDescription("User to mute").setRequired(true)),
    new SlashCommandBuilder()
      .setName("warn")
      .setDescription("Warn a member")
      .addUserOption((o) => o.setName("user").setDescription("User to warn").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason for warning")),
  ].map((cmd) => cmd.toJSON());

  const rest = new REST().setToken(token);
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    logger.info("Global slash commands registered");
  } catch (err) {
    logger.warn({ err }, "Failed to register slash commands");
  }
}

// ─── BOT STARTUP ─────────────────────────────────────────────────────────────
export async function startDiscordBot(): Promise<void> {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) {
    logger.warn("DISCORD_TOKEN not set — Discord bot will not start");
    return;
  }

  discordClient.once(Events.ClientReady, async (client) => {
    logger.info({ tag: client.user.tag }, "Discord bot logged in");
    await registerSlashCommands();
  });

  try {
    await discordClient.login(token);
  } catch (err) {
    logger.error({ err }, "Failed to login to Discord");
  }
}
