# Roamcast Deployment Guide

This guide outlines the steps to move your working development environment to production while maintaining the ability to continue development work.

## Table of Contents
- [1. Environment Setup](#1-environment-setup)
- [2. Infrastructure Migration](#2-infrastructure-migration)
- [3. Mobile App Deployment](#3-mobile-app-deployment)
- [4. Web Deployment](#4-web-deployment)
- [5. Going Live](#5-going-live-checklist)
- [6. Post-Launch Operations](#6-post-launch-operations)
- [7. Rollback Procedure](#7-rollback-procedure)

## 1. Environment Setup - DONE

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
Update `.env.production` with production-specific values. Make sure to use the correct variable prefixes (EXPO_PUBLIC_ for client-side variables):

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=<production-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<production-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>

# LiveKit Configuration
EXPO_PUBLIC_LIVEKIT_WS_URL=<production-livekit-url>
LIVEKIT_API_KEY=<production-livekit-key>
LIVEKIT_API_SECRET=<production-livekit-secret>

# Stripe Configuration
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=<production-stripe-publishable-key>
STRIPE_SECRET_KEY=<production-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<production-webhook-secret>

# App Configuration
EXPO_PUBLIC_APP_URL_SCHEME=roamcast
```

### 1.3 Environment Switching
Create a mechanism to switch between environments:

1. For local development, use `.env.development`
2. For production builds, use `.env.production`

Add this to your npm scripts in package.json:
```json
"scripts": {
  "dev": "cp .env.development .env && expo start",
  "build:prod": "cp .env.production .env && eas build"
}
```

## 2. Infrastructure Migration

### 2.1 Supabase Setup - DONE
1. Create new production project in Supabase dashboard
2. Migrate your database schema:
   ```bash
   # Export development database schema and data
   supabase db dump -f schema.sql --db-url=<development-database-url>
   
   # Apply schema to production 
   supabase db push --db-url=<production-database-url>
   ```
3. Update authentication settings in the Supabase dashboard:
   - Configure email templates
   - Set up allowed redirect URLs
   - Configure OAuth providers if used
4. Configure storage buckets with appropriate permissions
5. Deploy edge functions:
   ```bash
   supabase functions deploy --project-ref <production-project-ref>
   ```
6. Verify RLS policies are properly configured for production

### 2.2 Stripe Migration - DONE
1. Activate your production Stripe account
2. Set up production webhooks:
   - Create a webhook endpoint in Stripe dashboard pointed to your production API
   - Update the STRIPE_WEBHOOK_SECRET in your production environment
3. Recreate all products and prices in the production Stripe account
4. Update success/cancel URLs for production checkout sessions
5. Test a complete payment flow in the production environment

### 2.3 LiveKit Setup
1. Set up production LiveKit instance or use a dedicated cloud service
2. Configure production CORS settings:
   - Allow your production domain
   - Set appropriate timeout values
3. Create dedicated API keys for the production environment
4. Update security settings for production use
5. Test audio functionality in the production environment

## 3. Mobile App Deployment

### 3.1 Update EAS Configuration - DONE
1. Modify `eas.json` to include a production profile that uses production environment variables:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "<development-supabase-url>",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<development-anon-key>",
        "EXPO_PUBLIC_LIVEKIT_WS_URL": "<development-livekit-url>",
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY": "<development-stripe-key>",
        "EXPO_PUBLIC_APP_URL_SCHEME": "roamcast-dev"
      }
    },
    "production": {
      "distribution": "store",
      "channel": "production",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "<production-supabase-url>",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<production-anon-key>",
        "EXPO_PUBLIC_LIVEKIT_WS_URL": "<production-livekit-url>",
        "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY": "<production-stripe-key>",
        "EXPO_PUBLIC_APP_URL_SCHEME": "roamcast"
      }
    }
  }
}
```

### 3.2 Configure App Store Information
1. Prepare app store assets:
   - Icons and splash screens
   - Screenshots
   - App descriptions
   - Privacy policy URL

### 3.3 Production Build and Submit - DONE
```bash
# Clear any previous build cache
eas build:clean

# Build production version
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to stores
eas submit -p ios --latest
eas submit -p android --latest
```

## 4. Web Deployment

### 4.1 Production Setup - DONE
1. Configure production hosting on Vercel:
   - Connect your GitHub repository to Vercel
   - Create a new project from the repository
   - Configure environment variables in Vercel dashboard:
     - Go to Project Settings > Environment Variables
     - Add all production variables from your .env.production file
     - Ensure variables are only exposed to production environment
   - Set up production domain:
     - Go to Project Settings > Domains
     - Add your custom domain (e.g., roamcast.com)
     - Configure DNS settings as directed by Vercel
   - Configure build settings:
     - Set the correct framework preset (Next.js)
     - Configure build command if needed
     - Set output directory if different from default
   - Set up preview deployments for branches
     - Optionally configure different environment variables for preview deployments

2. Set up Vercel deployment protection rules:
   - Enable password protection for preview environments if needed
   - Configure deployment checks or integration tests

### 4.2 Branch Strategy - DONE
1. Create production branch:
```bash
git checkout -b production
git push origin production
```

2. Configure branch deployments:
   - `main` -> development/staging environment
   - `production` -> production environment

3. Set up automatic deployments:
   - Configure GitHub Actions or hosting provider's CI/CD
   - Add deployment checks (linting, testing, etc.)

## 5. Going Live Checklist

### 5.1 Before Launch
- [ ] Test all production environment variables
- [ ] Verify Supabase production setup:
  - [ ] Database schema
  - [ ] Authentication flows
  - [ ] RLS policies
  - [ ] Storage buckets
  - [ ] Edge functions
- [ ] Test Stripe production webhooks
- [ ] Verify LiveKit production server
- [ ] Test production builds of mobile apps
- [ ] Verify production web deployment
- [ ] Test all integrations in production environment
- [ ] Verify third-party service limits and quotas
- [ ] Set up monitoring and logging
- [ ] Perform security review
- [ ] Check data protection compliance

### 5.2 Launch Steps
1. DNS Configuration:
   - Point production domain to production hosting
   - Verify SSL certificates
   - Set up proper DNS caching
   
2. Mobile App:
   - Submit to App Store
   - Submit to Play Store
   - Prepare for app review process
   
3. Final Checks:
   - Verify authentication flows
   - Test payment processing with real cards
   - Check real-time audio functionality under various network conditions
   - Verify webhook operations
   - Test user onboarding flow
   - Monitor initial error rates

## 6. Post-Launch Operations

### 6.1 Development Workflow
1. Continue development using:
   - Development Supabase instance
   - Development Stripe account (test mode)
   - Development LiveKit server
   
2. Code management:
   - Develop in feature branches
   - Merge to `main` for staging testing
   - Merge to `production` for production releases
   - Consider adding a `staging` branch as an intermediate step

### 6.2 Deployment Process
1. Test changes thoroughly in development
2. Create production release:
```bash
# First update main with all tested changes
git checkout main
git pull origin main

# Update production branch
git checkout production
git merge main
git push origin production
```

3. Monitor deployment in real-time
4. Verify changes in production
5. Tag the release for future reference:
```bash
git tag -a v1.0.0 -m "First production release"
git push origin v1.0.0
```

### 6.3 Monitoring and Maintenance
- Set up error tracking with Sentry or similar service
- Monitor performance metrics:
  - API response times
  - Client-side performance
  - Database queries
- Track user feedback and app reviews
- Check system health regularly:
  - Database performance
  - Storage usage
  - API rate limits
- Schedule regular database backups
- Monitor third-party service usage and costs

## 7. Rollback Procedure

If issues occur in production:

1. Revert to last working commit:
```bash
git checkout production
git revert <problematic-commit>
git push origin production
```

2. If database changes involved:
   - Restore from last known good backup
   - Run downgrade migrations if available
   - Consider point-in-time recovery if supported by Supabase

3. Mobile app issues:
   - Use remote config to disable problematic features
   - Prepare hotfix release with increased version number
   - Submit expedited updates to app stores
   - Consider implementing a feature flag system for future releases

4. Communication plan:
   - Notify affected users
   - Update status page if available
   - Communicate timeline for fix

## Additional Notes

- Keep development and production environments completely separate
- Never use development keys in production
- Regularly backup production database
- Monitor production logs and metrics
- Consider implementing a staging environment between development and production
- Implement feature flags for safer deployments
- Keep this guide updated with any process changes
- Document all production credentials in a secure password manager
- Create runbooks for common production issues

## Contact

For deployment questions or issues, contact the development team lead. 