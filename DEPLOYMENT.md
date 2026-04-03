# Deployment Guide

This platform supports two deployment setups. You chose **Option 2** (Render + Vercel + MongoDB Atlas).

---

## Prerequisites

1. A [Discord Developer Application](https://discord.com/developers/applications) with a bot
2. A [MongoDB Atlas](https://cloud.mongodb.com) free cluster
3. A [Render](https://render.com) account (for the API + bot)
4. A [Vercel](https://vercel.com) account (for the dashboard frontend)

---

## Step 1: Discord Developer Setup

1. Go to https://discord.com/developers/applications
2. Create a new application
3. Go to **Bot** tab → Click **Add Bot** → Copy the **Token** → set as `DISCORD_TOKEN`
4. Go to **General Information** → Copy **Client ID** → set as `DISCORD_CLIENT_ID`
5. Go to **General Information** → Copy **Client Secret** → set as `DISCORD_CLIENT_SECRET`
6. Go to **OAuth2 → Redirects** → Add:
   - `https://your-render-api.onrender.com/api/auth/discord/callback`
7. Go to **Bot** tab → Enable these **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent
8. **Invite the bot** to your server using this URL (replace CLIENT_ID):
   ```
   https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands
   ```
   (Permission 8 = Administrator — adjust as needed)

---

## Step 2: MongoDB Atlas Setup

1. Go to https://cloud.mongodb.com → Create a free cluster
2. Create a database user (Database Access tab)
3. Whitelist all IPs: Network Access → Add IP → `0.0.0.0/0`
4. Get connection string: Clusters → Connect → Connect your application
5. Replace `<password>` and `<dbname>` → set as `MONGODB_URI`

---

## Step 3: Deploy API Server + Bot to Render

1. Push your code to GitHub
2. Go to https://render.com → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Root Directory**: `artifacts/api-server`
   - **Build Command**: `cd ../../ && pnpm install && pnpm --filter @workspace/api-server run build`
   - **Start Command**: `node --enable-source-maps ./dist/index.mjs`
   - **Environment**: Node
5. Add environment variables:
   ```
   DISCORD_TOKEN=...
   DISCORD_CLIENT_ID=...
   DISCORD_CLIENT_SECRET=...
   MONGODB_URI=...
   SESSION_SECRET=... (generate a strong random string)
   DASHBOARD_URL=https://your-vercel-app.vercel.app
   NODE_ENV=production
   ```
6. Deploy → Note your Render URL (e.g. `https://discord-bot-api.onrender.com`)

---

## Step 4: Deploy Dashboard to Vercel

1. Go to https://vercel.com → New Project → Import your repo
2. Settings:
   - **Framework**: Vite
   - **Root Directory**: `artifacts/dashboard`
   - **Build Command**: `cd ../../ && pnpm install && pnpm --filter @workspace/dashboard run build`
   - **Output Directory**: `dist/public`
3. Add environment variables:
   ```
   VITE_API_URL=https://your-render-api.onrender.com
   ```
4. Deploy → Note your Vercel URL

---

## Step 5: Update Discord OAuth2 Redirect URI

After deploying, go back to Discord Developer Portal → OAuth2 → Redirects and ensure:
```
https://your-render-api.onrender.com/api/auth/discord/callback
```
is listed (replace with your actual Render URL).

---

## Step 6: Update DASHBOARD_URL on Render

In your Render service, update the `DASHBOARD_URL` env var to your Vercel URL:
```
DASHBOARD_URL=https://your-vercel-app.vercel.app
```
Trigger a re-deploy.

---

## Option 1: All-in-One Replit Deployment

If you prefer to host everything on Replit:

1. The API server and Discord bot already run together on Replit
2. All secrets are set in Replit Secrets (already done)
3. Click **Deploy** in Replit to publish
4. Set `DASHBOARD_URL` to your Replit deployment URL
5. Update Discord OAuth2 redirect URI to: `https://your-replit-app.replit.app/api/auth/discord/callback`

---

## Architecture Overview

```
Discord ←──→ Bot (discord.js)
                    │
              API Server (Express)     ←── Dashboard (React/Vite)
                    │                           │
              MongoDB Atlas            Discord OAuth2
```

The API server handles:
- Discord OAuth2 login flow
- Guild configuration CRUD (stored in MongoDB)
- Embed design management
- Activity log queries
- Stats aggregation

The bot handles:
- Real-time Discord events (member join/leave, messages)
- Slash commands (/ban, /kick, /mute, /warn)
- Prefix commands (!ban, !kick, !mute, !warn)
- Welcome/goodbye messages
- Auto-role assignment
- Anti-spam detection
- Activity logging to MongoDB
