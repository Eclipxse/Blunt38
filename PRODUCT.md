# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Discord server owners and administrators who can manage a guild and want to configure blunt38 through a browser instead of handling every setting inside Discord.

## Product Purpose

blunt38 is a Discord bot and control panel for music playback, AI replies, member workflows, roles, tickets, levels, temporary voice channels, and moderation logs. The public homepage is primarily an authentication portal that gets returning users into their server dashboard through Discord OAuth.

## Positioning

blunt38 brings the bot's music and server operations into one opinionated control surface with a deliberately blunt, uncensored personality.

## Operating Context

Visitors arrive at `panel.eclipxse.in`, authenticate with Discord, select a server they can manage, and configure the bot. The bot itself runs continuously on a VPS; the dashboard must keep the existing Discord OAuth and authenticated dashboard workflows intact.

## Capabilities and Constraints

- Preserve the existing `/api/auth/login` Discord OAuth entry point and all authenticated dashboard behavior.
- The login page is a portal for existing users, not a long-form public marketing site.
- The page must remain responsive and usable with reduced motion enabled.
- Do not fabricate server counts, user counts, performance numbers, customers, or testimonials.

## Brand Commitments

- Product name: blunt38.
- Keep the aggressive, uncensored copy and tone.
- Preserve the signal, surveillance, glitch, and transmission vocabulary already used throughout the dashboard.
- Keep the existing watcher artwork as a secondary reactive element, not the dominant full-screen hero.
- Use a liquid-filled wordmark preloader inspired by the interaction on `neoleaf.bytetown.agency`, translated into blunt38's own visual language and implementation.

## Evidence on Hand

- Login and OAuth flow: `dashboard/src/components/dashboard-login.tsx` and `dashboard/src/app/api/auth/`.
- Dashboard capabilities and navigation: `dashboard/src/components/dashboard-app.tsx` and `dashboard/src/components/dashboard-views.tsx`.
- Existing reactive watcher and signal system: `dashboard/src/components/watcher-38.tsx` and `dashboard/src/components/signal-effects.tsx`.
- Existing brand artwork: `dashboard/public/brand/`.

## Product Principles

- Make login immediate and unmistakable after the opening brand moment.
- Let interaction prove the bot is alive; do not bury the action under decorative effects.
- Keep the voice specific, provocative, and concise.
- Preserve real Discord workflows and show no unsupported claims.
