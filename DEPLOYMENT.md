# Roamcast Deployment Guide

## Environment Setup 

### Native App

We've set up distinct environment files for development and production:

- `.env.development` - Contains development environment variables
- `.env.production` - Contains production environment variables (update with actual production values)

**Scripts:**
- Development: `npm run dev`
- Production simulation: `npm run prod`
- Production build: `npm run build:prod`
- Platform-specific builds: `npm run build:prod:ios` or `npm run build:prod:android`

### Web App

We've set up distinct environment files for development and production:

- `web/.env.local.development` - Contains development environment variables
- `web/.env.local.production` - Contains production environment variables (update with actual production values)

**Scripts:**
- Development: `cd web && npm run dev:local`
- Production simulation: `cd web && npm run prod:local`
- Production build: `cd web && npm run build:prod`
- Production start: `cd web && npm run start:prod`

## Before Going to Production

1. Update `.env.production` and `web/.env.local.production` with your actual production values:
   - Supabase production URL and keys
   - LiveKit production URL and keys
   - Stripe production keys
   - App URL scheme (remove `-dev` suffix if present)

2. Follow the more detailed instructions in the full deployment guide:
   - Set up production infrastructure (Supabase, LiveKit, Stripe)
   - Configure mobile app stores
   - Set up production web hosting
   - Create production branches

## Switching Between Environments

- For native app development, use: `npm run dev`
- For native app production testing, use: `npm run prod`
- For web app development, use: `cd web && npm run dev:local`
- For web app production testing, use: `cd web && npm run prod:local`

Remember to keep your production credentials secure and never commit them to version control. 