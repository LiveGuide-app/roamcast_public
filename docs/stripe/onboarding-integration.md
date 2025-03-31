# Stripe Connect Onboarding Integration Plan

## Overview
This document outlines the plan to integrate Stripe Connect's hosted onboarding into our React Native application, allowing tour guides to set up their accounts to receive tips.

## Current Architecture
- React Native frontend with Expo Router
- Supabase backend
- Existing tour guide profiles
- Existing tour and tipping UI

## Integration Steps

### 1. Database Updates

```sql
-- Add Stripe-related columns to tour_guides table
ALTER TABLE tour_guides
ADD COLUMN stripe_account_id TEXT,
ADD COLUMN stripe_account_status TEXT,
ADD COLUMN stripe_account_enabled BOOLEAN DEFAULT false,
ADD COLUMN stripe_account_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN stripe_account_updated_at TIMESTAMP WITH TIME ZONE;
```

### 2. Environment Setup

Add the following environment variables to `.env`:
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Supabase Functions Implementation

Create two functions in `supabase/functions/`:

1. **Onboarding Function** (`supabase/functions/stripe-onboarding/index.ts`)
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create Stripe account
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_profile: {
        name: user.user_metadata?.full_name || 'Tour Guide',
      }
    })

    // Create account link for hosted onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${Deno.env.get('APP_URL')}/stripe/refresh`,
      return_url: `${Deno.env.get('APP_URL')}/stripe/return`,
      type: 'account_onboarding',
    })

    // Update guide's Stripe account ID
    const { error: updateError } = await supabase
      .from('tour_guides')
      .update({
        stripe_account_id: account.id,
        stripe_account_status: account.status,
        stripe_account_enabled: account.capabilities?.card_payments === 'active',
        stripe_account_created_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in Stripe onboarding:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to start onboarding' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

2. **Dashboard Link Function** (`supabase/functions/stripe-dashboard-link/index.ts`):
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get guide's Stripe account ID
    const { data: guide, error: guideError } = await supabase
      .from('tour_guides')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

    if (guideError || !guide?.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Stripe account not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create dashboard link
    const accountLink = await stripe.accountLinks.create({
      account: guide.stripe_account_id,
      refresh_url: `${Deno.env.get('APP_URL')}/stripe/refresh`,
      return_url: `${Deno.env.get('APP_URL')}/stripe/return`,
      type: 'dashboard',
    })

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating dashboard link:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create dashboard link' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### 4. Frontend Implementation

Add buttons to the guide's profile screen for both onboarding and dashboard access:

```typescript
// In your guide profile screen
const handleStripeOnboarding = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) throw new Error('Not authenticated');

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-onboarding`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const { url, error } = await response.json();
    if (error) throw new Error(error);

    // Open Stripe's hosted onboarding in browser
    await Linking.openURL(url);
  } catch (err) {
    Alert.alert(
      'Error',
      err instanceof Error ? err.message : 'Something went wrong'
    );
  }
};

const handleStripeDashboard = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) throw new Error('Not authenticated');

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-dashboard-link`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const { url, error } = await response.json();
    if (error) throw new Error(error);

    // Open Stripe Dashboard in browser
    await Linking.openURL(url);
  } catch (err) {
    Alert.alert(
      'Error',
      err instanceof Error ? err.message : 'Something went wrong'
    );
  }
};

// In your profile screen JSX
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Payment Settings</Text>
  {!guide.stripe_account_id ? (
    <TouchableOpacity
      style={styles.button}
      onPress={handleStripeOnboarding}
    >
      <Text style={styles.buttonText}>Set Up Payments</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      style={styles.button}
      onPress={handleStripeDashboard}
    >
      <Text style={styles.buttonText}>Open Stripe Dashboard</Text>
    </TouchableOpacity>
  )}
  {guide.stripe_account_id && (
    <Text style={styles.statusText}>
      Status: {guide.stripe_account_enabled ? 'Active' : 'Pending'}
    </Text>
  )}
</View>
```

### 5. Webhook Handling

Create webhook handler (`supabase/functions/stripe-webhook/index.ts`):
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    switch (event.type) {
      case 'account.updated':
        const account = event.data.object as Stripe.Account
        await supabase
          .from('tour_guides')
          .update({
            stripe_account_status: account.status,
            stripe_account_enabled: account.capabilities?.card_payments === 'active',
            stripe_account_updated_at: new Date().toISOString(),
          })
          .eq('stripe_account_id', account.id)
        break

      case 'account.application.deauthorized':
        const deauthAccount = event.data.object as Stripe.Account
        await supabase
          .from('tour_guides')
          .update({
            stripe_account_enabled: false,
            stripe_account_updated_at: new Date().toISOString(),
          })
          .eq('stripe_account_id', deauthAccount.id)
        break
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### 6. Integration Points

1. **Guide Profile Screen**
   - Add buttons for onboarding and dashboard access
   - Show account status (if set up)
   - Display payment capabilities

2. **Tour Completion Flow**
   - Check guide's Stripe account status before allowing tips
   - Show appropriate messaging if account not set up

### 7. Testing Plan

1. **Integration Tests**
   - Complete onboarding flow
   - Webhook handling
   - Database updates

2. **Test Cards**
   - Use Stripe test mode
   - Test various payment scenarios
   - Verify webhook events

### 8. Deployment Checklist

1. **Environment Setup**
   - Add Stripe keys to Supabase environment
   - Configure webhook endpoints
   - Set up proper CORS and security headers

2. **Database Migration**
   - Run migrations in staging
   - Verify data integrity
   - Plan production migration

3. **Monitoring**
   - Set up error tracking
   - Monitor webhook events
   - Track onboarding completion rates

## Next Steps

1. Set up Stripe account and get API keys
2. Implement database migrations
3. Deploy Supabase Functions
4. Add onboarding button to guide profile
5. Set up webhook handling
6. Test in development environment
7. Deploy to staging
8. Test with real accounts
9. Deploy to production
10. Monitor and maintain 