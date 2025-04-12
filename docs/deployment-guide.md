# Roamcast Deployment Guide

This guide outlines the steps to move your working development environment to production while maintaining the ability to continue development work.

## Table of Contents
- [1. Environment Setup](#1-environment-setup)
- [2. Infrastructure Migration](#2-infrastructure-migration)
- [3. Mobile App Deployment](#3-mobile-app-deployment)
- [4. Web Deployment](#4-web-deployment)
- [5. Going Live Checklist](#5-going-live-checklist)
- [6. Post-Launch Operations](#6-post-launch-operations)
- [7. Rollback Procedure](#7-rollback-procedure)

## 1. Environment Setup

### 1.1 Preserve Development Environment
1. Create a backup of your current working environment:
```bash
cp .env .env.development
```

2. Create a new production environment file:
```bash
cp .env.example .env.production
```

### 1.2 Configure Production Variables
Update `.env.production` with production-specific values:
```bash
# Supabase
SUPABASE_URL=<production-url>
SUPABASE_ANON_KEY=<production-key>
SUPABASE_SERVICE_ROLE_KEY=<production-role-key>

# Stripe
STRIPE_SECRET_KEY=<production-stripe-key>
STRIPE_PUBLISHABLE_KEY=<production-stripe-publishable>
STRIPE_WEBHOOK_SECRET=<production-webhook-secret>

# LiveKit
LIVEKIT_API_KEY=<production-livekit-key>
LIVEKIT_API_SECRET=<production-livekit-secret>
LIVEKIT_URL=<production-livekit-url>

# App-specific
APP_URL=https://roamcast.com
API_URL=https://api.roamcast.com
```

## 2. Infrastructure Migration

### 2.1 Supabase Setup
1. Create new production project in Supabase
2. Migrate your database:
   ```bash
   # Export development database schema
   supabase db dump -f schema.sql
   
   # Apply schema to production
   supabase db push --db-url=<production-database-url>
   ```
3. Update authentication settings
4. Configure storage buckets
5. Deploy edge functions

### 2.2 Stripe Migration
1. Create production Stripe account
2. Set up production webhooks
3. Create production products/price IDs
4. Update success/cancel URLs for production

### 2.3 LiveKit Setup
1. Set up production LiveKit instance
2. Configure production CORS and security settings

## 3. Mobile App Deployment

### 3.1 Update EAS Configuration
1. Modify `eas.json`:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "APP_ENV": "development"
      }
    },
    "production": {
      "distribution": "store",
      "channel": "production",
      "env": {
        "APP_ENV": "production"
      }
    }
  }
}
```

### 3.2 Production Build and Submit
```bash
# Build production version
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to stores
eas submit -p ios --profile production
eas submit -p android --profile production
```

## 4. Web Deployment

### 4.1 Production Setup
1. Configure production hosting (Vercel/Netlify):
   - Set production environment variables
   - Configure custom domain
   - Set up SSL

### 4.2 Branch Strategy
1. Create production branch:
```bash
git checkout -b production
git push origin production
```

2. Configure branch deployments:
   - `main` -> development environment
   - `production` -> production environment

## 5. Going Live Checklist

### 5.1 Before Launch
- [ ] Test all production environment variables
- [ ] Verify Supabase production setup
- [ ] Test Stripe production webhooks
- [ ] Verify LiveKit production server
- [ ] Test production builds of mobile apps
- [ ] Verify production web deployment
- [ ] Test all integrations in production environment

### 5.2 Launch Steps
1. DNS Configuration:
   - Point production domain to production hosting
   - Verify SSL certificates
   
2. Mobile App:
   - Submit to App Store
   - Submit to Play Store
   
3. Final Checks:
   - Verify authentication flows
   - Test payment processing
   - Check real-time audio functionality
   - Verify webhook operations

## 6. Post-Launch Operations

### 6.1 Development Workflow
1. Continue development using:
   - Development Supabase instance
   - Development Stripe account
   - Development LiveKit server
   
2. Code management:
   - Develop in feature branches
   - Merge to `main` for development testing
   - Merge to `production` for production releases

### 6.2 Deployment Process
1. Test changes in development
2. Create production release:
```bash
git checkout production
git merge main
git push origin production
```

3. Monitor deployment
4. Verify changes in production

### 6.3 Monitoring
- Watch error rates
- Monitor performance metrics
- Track user feedback
- Check system health

## 7. Rollback Procedure

If issues occur in production:

1. Revert to last working commit:
```bash
git checkout production
git revert <problematic-commit>
git push origin production
```

2. If database changes involved:
   - Restore from last backup
   - Run downgrade migrations

3. Mobile app issues:
   - Disable problematic features via remote config
   - Prepare hotfix release if needed

## Additional Notes

- Keep development and production environments completely separate
- Never use development keys in production
- Regularly backup production database
- Monitor production logs and metrics
- Keep this guide updated with any process changes

## Contact

For deployment questions or issues, contact the development team lead. 