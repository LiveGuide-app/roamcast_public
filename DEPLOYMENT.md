# Deployment Guide

This document outlines the deployment process for the Roamcast application.

## Prerequisites

- Expo account
- Supabase project
- LiveKit server
- Stripe account
- Apple Developer account (for iOS)
- Google Play Developer account (for Android)

## Environment Setup

1. Create the following environment files:
   - `.env.development` - Development environment variables
   - `.env.production` - Production environment variables

2. Required environment variables:
   - Supabase configuration
   - LiveKit configuration
   - Stripe configuration

## Building for Production

### iOS

```bash
npm run build:prod:ios
```

### Android

```bash
npm run build:prod:android
```

## Deployment Steps

1. Update version numbers in `app.json`
2. Build the application
3. Submit to app stores
4. Update server configurations if needed

## Monitoring

- Monitor application performance
- Track error rates
- Monitor server health
- Check payment processing

## Rollback Procedure

1. Identify the last stable version
2. Revert code changes if needed
3. Rebuild and redeploy
4. Notify users if necessary 