import { Schema, model } from "mongoose";

// Sub-schema for welcome/goodbye config
const WelcomeConfigSchema = new Schema({
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },
  message: { type: String, default: null },
  embedId: { type: String, default: null },
}, { _id: false });

// Sub-schema for moderation config
const ModerationConfigSchema = new Schema({
  enabled: { type: Boolean, default: false },
  logChannelId: { type: String, default: null },
  muteRoleId: { type: String, default: null },
}, { _id: false });

// Sub-schema for logging config
const LoggingConfigSchema = new Schema({
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },
  logJoins: { type: Boolean, default: true },
  logLeaves: { type: Boolean, default: true },
  logMessageDeletes: { type: Boolean, default: true },
  logMessageEdits: { type: Boolean, default: false },
  logModActions: { type: Boolean, default: true },
}, { _id: false });

// Sub-schema for auto-role config
const AutoRoleConfigSchema = new Schema({
  enabled: { type: Boolean, default: false },
  roleIds: { type: [String], default: [] },
}, { _id: false });

// Sub-schema for anti-spam config
const AntiSpamConfigSchema = new Schema({
  enabled: { type: Boolean, default: false },
  maxMessages: { type: Number, default: 5 },
  timeWindowSeconds: { type: Number, default: 5 },
  action: { type: String, default: "warn" },
}, { _id: false });

// Sub-schema for reaction role item
const ReactionRoleItemSchema = new Schema({
  emoji: { type: String, required: true },
  roleId: { type: String, required: true },
}, { _id: false });

// Sub-schema for reaction roles config
const ReactionRolesConfigSchema = new Schema({
  enabled: { type: Boolean, default: false },
  items: { type: [ReactionRoleItemSchema], default: [] },
}, { _id: false });

// Main guild config schema
const GuildConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: "!" },
  welcome: { type: WelcomeConfigSchema, default: () => ({}) },
  goodbye: { type: WelcomeConfigSchema, default: () => ({}) },
  moderation: { type: ModerationConfigSchema, default: () => ({}) },
  logging: { type: LoggingConfigSchema, default: () => ({}) },
  autoRole: { type: AutoRoleConfigSchema, default: () => ({}) },
  antiSpam: { type: AntiSpamConfigSchema, default: () => ({}) },
  reactionRoles: { type: ReactionRolesConfigSchema, default: () => ({}) },
}, { timestamps: true });

export const GuildConfigModel = model("GuildConfig", GuildConfigSchema);

// Helper to get or create guild config
export async function getOrCreateGuildConfig(guildId: string) {
  let config = await GuildConfigModel.findOne({ guildId });
  if (!config) {
    config = await GuildConfigModel.create({ guildId });
  }
  return config;
}
