# Discord Bot Dashboard Platform

A full-stack Discord bot platform similar to Carl-bot with a powerful web dashboard and full customization capabilities.

## Overview

- **Discord Bot** — slash commands (/ban, /kick, /mute, /warn), prefix commands, welcome/goodbye messages, auto-roles, logging, reaction roles, anti-spam
- **Web Dashboard** — React/Vite frontend with Discord OAuth2 login, server selection, embed editor with live preview, and all settings sections
- **API Server** — Express 5 backend connecting bot, dashboard, and MongoDB
- **Database** — MongoDB (via MONGODB_URI env var)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Discord**: discord.js v14
- **Database**: MongoDB + Mongoose
- **Validation**: Zod (`zod/v4`), Orval codegen
- **Frontend**: React + Vite + Tailwind CSS (dark Discord-like theme)
- **Auth**: Discord OAuth2 (session-based)
- **API codegen**: Orval (from OpenAPI spec)

## Key Commands

- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server + bot locally
- `pnpm --filter @workspace/dashboard run dev` — run dashboard frontend locally

## Project Structure

```
artifacts/
  api-server/
    src/
      lib/
        mongodb.ts       — MongoDB connection
        discordBot.ts    — Discord.js bot (events, commands, anti-spam)
        discordApi.ts    — Discord REST API helpers (OAuth2, guilds)
      models/
        GuildConfig.ts   — Guild settings schema
        EmbedDesign.ts   — Embed designs schema
        ActivityLog.ts   — Activity log schema
      routes/
        auth.ts          — Discord OAuth2 routes
        guilds.ts        — Guild/channel/role routes
        config.ts        — Guild config CRUD
        embeds.ts        — Embed design CRUD + send
        stats.ts         — Stats and logs
      middlewares/
        auth.ts          — requireAuth middleware
  dashboard/
    src/
      pages/             — React pages (landing, guilds, guild sections)
      components/        — UI components including embed editor
lib/
  api-spec/openapi.yaml  — OpenAPI spec (source of truth)
  api-client-react/      — Generated React Query hooks
  api-zod/               — Generated Zod schemas
```

## Environment Variables Required

- `DISCORD_TOKEN` — Bot token
- `DISCORD_CLIENT_ID` — Application client ID
- `DISCORD_CLIENT_SECRET` — Application client secret
- `MONGODB_URI` — MongoDB Atlas connection string
- `SESSION_SECRET` — Session signing secret
- `DASHBOARD_URL` — Dashboard URL (for OAuth2 redirect in production)

## Deployment

See `DEPLOYMENT.md` for full guide:
- **Option 1**: All on Replit (bot + dashboard together)
- **Option 2**: Bot/API on Render + Dashboard on Vercel + MongoDB Atlas

## Bot Features

- `/ban`, `/kick`, `/mute`, `/warn` slash commands
- `!ban`, `!kick`, `!mute`, `!warn` prefix commands
- Custom welcome/goodbye messages with variable substitution
- Auto-role assignment on member join
- Activity logging (joins, leaves, message deletes/edits, mod actions)
- Anti-spam with configurable actions (warn/mute/kick/ban)
- Reaction roles system (toggle-based)
- All settings configurable from the web dashboard

## Dashboard Features

- Discord OAuth2 login
- Server grid with bot-present indicator
- Per-guild sidebar with all config sections
- Visual embed editor with live Discord-like preview
- Variable highlighting in embed content
- Toggle modules ON/OFF
- Real-time save with toast notifications
