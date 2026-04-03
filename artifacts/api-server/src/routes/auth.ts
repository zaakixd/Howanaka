/**
 * Discord OAuth2 authentication routes.
 * Handles login initiation, callback, logout, and /me endpoint.
 */
import { Router, type IRouter } from "express";
import {
  exchangeCode,
  fetchDiscordUser,
} from "../lib/discordApi";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getRedirectUri(req: any): string {
  // Use DASHBOARD_URL env var in production, otherwise detect from request
  const base = process.env["DASHBOARD_URL"] || `${req.protocol}://${req.get("host")}`;
  return `${base}/api/auth/discord/callback`;
}

// GET /api/auth/discord — redirect user to Discord OAuth2
router.get("/auth/discord", (req, res): void => {
  const clientId = process.env["DISCORD_CLIENT_ID"];
  if (!clientId) {
    res.status(500).json({ error: "Discord OAuth2 not configured" });
    return;
  }

  const redirectUri = getRedirectUri(req);
  const state = Math.random().toString(36).slice(2);

  // Store state in session to prevent CSRF
  (req.session as any).oauthState = state;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email guilds",
    state,
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// GET /api/auth/discord/callback — handle OAuth2 callback
router.get("/auth/discord/callback", async (req, res): Promise<void> => {
  const { code, state } = req.query as { code?: string; state?: string };

  const storedState = (req.session as any).oauthState;

  // Validate state to prevent CSRF
  if (!state || state !== storedState) {
    req.log.warn("Invalid OAuth2 state");
    res.redirect("/?error=invalid_state");
    return;
  }

  if (!code) {
    res.redirect("/?error=no_code");
    return;
  }

  try {
    const redirectUri = getRedirectUri(req);
    const tokenData = await exchangeCode(code, redirectUri);
    const user = await fetchDiscordUser(tokenData.access_token);

    // Store user and access token in session
    (req.session as any).user = user;
    (req.session as any).accessToken = tokenData.access_token;
    (req.session as any).oauthState = null;

    req.log.info({ userId: user.id }, "User authenticated");

    // Redirect to guild selection
    res.redirect("/guilds");
  } catch (err) {
    logger.error({ err }, "OAuth2 callback error");
    res.redirect("/?error=auth_failed");
  }
});

// POST /api/auth/logout
router.post("/auth/logout", (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, "Session destroy error");
    }
    res.json({ message: "Logged out" });
  });
});

// GET /api/auth/me
router.get("/auth/me", (req, res): void => {
  const user = (req.session as any)?.user;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(user);
});

export default router;
