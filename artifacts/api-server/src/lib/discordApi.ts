/**
 * Helpers for making Discord REST API calls on behalf of the user (OAuth2 token)
 * and on behalf of the bot.
 */
import { logger } from "./logger";

const DISCORD_API = "https://discord.com/api/v10";

// Fetch the current user from Discord using their OAuth2 access token
export async function fetchDiscordUser(accessToken: string) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord API error: ${res.status}`);
  return res.json() as Promise<{
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    email?: string;
  }>;
}

// Fetch guilds the user is in using their OAuth2 access token
export async function fetchUserGuilds(accessToken: string) {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord API error: ${res.status}`);
  return res.json() as Promise<
    Array<{
      id: string;
      name: string;
      icon: string | null;
      permissions: string;
      owner: boolean;
    }>
  >;
}

// Filter guilds where the user has MANAGE_GUILD permission
export function filterManageableGuilds(
  guilds: Array<{ id: string; name: string; icon: string | null; permissions: string; owner: boolean }>,
) {
  return guilds.filter((g) => {
    const perms = BigInt(g.permissions);
    const MANAGE_GUILD = BigInt(0x20);
    const ADMINISTRATOR = BigInt(0x8);
    return g.owner || !!(perms & MANAGE_GUILD) || !!(perms & ADMINISTRATOR);
  });
}

// Fetch guild channels using the bot token
export async function fetchGuildChannels(guildId: string) {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) throw new Error("Bot token not configured");

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) {
    logger.warn({ status: res.status, guildId }, "Failed to fetch guild channels");
    return [];
  }
  return res.json() as Promise<Array<{ id: string; name: string; type: number }>>;
}

// Fetch guild roles using the bot token
export async function fetchGuildRoles(guildId: string) {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) throw new Error("Bot token not configured");

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) {
    logger.warn({ status: res.status, guildId }, "Failed to fetch guild roles");
    return [];
  }
  return res.json() as Promise<Array<{ id: string; name: string; color: number; position: number }>>;
}

// Fetch guild info using the bot token
export async function fetchGuildInfo(guildId: string) {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) throw new Error("Bot token not configured");

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}?with_counts=true`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{
    id: string;
    name: string;
    icon: string | null;
    approximate_member_count?: number;
  }>;
}

// Exchange OAuth2 code for access token
export async function exchangeCode(code: string, redirectUri: string) {
  const clientId = process.env["DISCORD_CLIENT_ID"];
  const clientSecret = process.env["DISCORD_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("Discord OAuth2 credentials not configured");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OAuth2 token exchange failed: ${err}`);
  }

  return res.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
  }>;
}
