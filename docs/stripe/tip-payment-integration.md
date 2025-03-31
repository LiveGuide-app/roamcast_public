# Stripe Tip Payment Integration Plan

## Overview
This document outlines the plan to integrate Stripe Connect's direct charges for handling tips in our React Native application. When a tour is completed, guests can leave a tip for their tour guide using Stripe's payment sheet.

## Current Architecture
- React Native frontend with Expo Router
- Supabase backend with Row Level Security (RLS)
- Existing user profiles with Stripe Connect accounts
- Existing tour rating UI
- Separate tables for tour participants and tips

## Database Schema

### Tour Participants Table
```sql
CREATE TABLE tour_participants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id uuid REFERENCES tours,
  device_id text,
  join_time timestamptz DEFAULT timezone('utc'::text, now()),
  leave_time timestamptz,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now()),
  deleted_at timestamptz
);

-- RLS Policy for tour_participants
CREATE POLICY "Access tour participants"
ON tour_participants
FOR ALL
TO public
USING (
  -- Allow reading for active/pending tours
  (EXISTS (
    SELECT 1 FROM tours
    WHERE tours.id = tour_participants.tour_id
    AND tours.status = ANY (ARRAY['active'::text, 'pending'::text])
  ))
  OR
  -- Allow reading own record for completed tours
  (EXISTS (
    SELECT 1 FROM tours
    WHERE tours.id = tour_participants.tour_id
    AND tours.status = 'completed'
    AND tour_participants.device_id = current_setting('request.jwt.claims')::json->>'device_id'
  ))
);
```

### Tour Tips Table
```sql
CREATE TABLE tour_tips (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_participant_id uuid NOT NULL REFERENCES tour_participants(id),
  amount integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'requires_payment_method', 'requires_confirmation')),
  payment_intent_id text,
  application_fee_amount integer,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now()),
  deleted_at timestamptz,
  -- Ensure one successful tip per participant
  UNIQUE(tour_participant_id) WHERE status = 'succeeded'
);

-- RLS Policy for tour_tips
CREATE POLICY "Access own tips"
ON tour_tips
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM tour_participants
    WHERE tour_participants.id = tour_tips.tour_participant_id
    AND tour_participants.device_id = current_setting('request.jwt.claims')::json->>'device_id'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON tour_tips
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Integration Steps

### 1. Database Updates

```sql
-- Add currency column to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS stripe_default_currency TEXT DEFAULT 'gbp';
```

### 2. Stripe SDK Setup

1. **Install Dependencies**
```bash
# Install Stripe React Native SDK
yarn add @stripe/stripe-react-native

# For iOS, run pod install in the ios directory
cd ios && pod install && cd ..
```

2. **Environment Variables**
Add to `.env`:
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_APP_URL_SCHEME=roamcast
EXPO_PUBLIC_APP_MERCHANT_ID=merchant.com.roamcast
```

3. **App Configuration**
Update `app/_layout.tsx` to wrap the app with StripeProvider:
```typescript
import { StripeProvider } from '@stripe/stripe-react-native';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StripeProvider 
        publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
        urlScheme={process.env.EXPO_PUBLIC_APP_URL_SCHEME!}
        merchantIdentifier={process.env.EXPO_PUBLIC_APP_MERCHANT_ID!}
      >
        <AuthProvider>
          <ProtectedRoute>
            {/* ... existing Stack configuration ... */}
          </ProtectedRoute>
        </AuthProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
```

Note: The `stripeAccountId` parameter is not included in the root StripeProvider as it will be set dynamically for each payment based on the guide's connected account ID. This is handled in the payment sheet initialization.

### 3. Supabase Functions Implementation

Create a new function in `supabase/functions/` for handling tip payments:

```typescript
// supabase/functions/stripe-tip-payment/index.ts
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

    // Get request body
    const { tourParticipantId, amount, currency, deviceId } = await req.json()

    // Verify tour participant exists and belongs to the device
    const { data: participant, error: participantError } = await supabase
      .from('tour_participants')
      .select(`
        *,
        tours (
          users!tours_guide_id_fkey (
            stripe_account_id,
            stripe_account_enabled,
            stripe_default_currency
          )
        )
      `)
      .eq('id', tourParticipantId)
      .eq('device_id', deviceId)
      .single()

    if (participantError || !participant) {
      console.error('Tour participant error:', participantError);
      return new Response(
        JSON.stringify({ error: 'Tour participant not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if a successful tip already exists
    const { data: existingTip } = await supabase
      .from('tour_tips')
      .select('id')
      .eq('tour_participant_id', tourParticipantId)
      .eq('status', 'succeeded')
      .single()

    if (existingTip) {
      return new Response(
        JSON.stringify({ error: 'Tip already paid' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!participant.tours.users.stripe_account_enabled) {
      return new Response(
        JSON.stringify({ error: 'Guide has not enabled payments' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get guide's default currency or use provided currency
    const guideCurrency = participant.tours.users.stripe_default_currency || currency

    // Calculate application fee (5% of tip amount)
    const applicationFeeAmount = Math.round(amount * 0.05)

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: guideCurrency,
      automatic_payment_methods: {
        enabled: true,
      },
      application_fee_amount: applicationFeeAmount,
      metadata: {
        tourParticipantId,
        tourId: participant.tour_id,
        guideId: participant.tours.users.id,
        originalCurrency: currency,
        guideCurrency,
        deviceId,
      },
    }, {
      stripeAccount: participant.tours.users.stripe_account_id,
    })

    // Create tip record
    const { error: tipError } = await supabase
      .from('tour_tips')
      .insert({
        tour_participant_id: tourParticipantId,
        amount,
        currency: guideCurrency,
        status: 'pending',
        payment_intent_id: paymentIntent.id,
        application_fee_amount: applicationFeeAmount
      })

    if (tipError) throw tipError

    return new Response(
      JSON.stringify({
        paymentIntent: paymentIntent.client_secret,
        publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create payment intent' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### 4. Frontend Implementation

Add the tipping section to the tour rating screen:

```typescript
// In your tour rating screen
import { useStripe } from '@stripe/stripe-react-native'
import { Alert, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { formatCurrency } from '../utils/currency'

const TippingSection = ({ tourParticipantId, guideCurrency = 'usd' }) => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe()
  const [loading, setLoading] = useState(false)
  const [paymentSheetReady, setPaymentSheetReady] = useState(false)

  // Initialize payment sheet when component mounts
  useEffect(() => {
    initializePaymentSheet()
  }, [tourParticipantId])

  const initializePaymentSheet = async () => {
    try {
      setLoading(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) throw new Error('Not authenticated')

      // Create payment intent
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-tip-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tourParticipantId,
            amount: 1000, // Default amount, will be updated when user selects tip
            currency: guideCurrency,
          }),
        }
      )
      const { paymentIntent, publishableKey, error } = await response.json()
      if (error) throw new Error(error)

      // Initialize payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Roamcast',
        paymentIntentClientSecret: paymentIntent,
        publishableKey: publishableKey,
        // Allow delayed payment methods like US bank accounts
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: 'Guest',
        },
      })

      if (initError) throw initError

      setPaymentSheetReady(true)
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to initialize payment'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleTip = async (amount) => {
    try {
      setLoading(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) throw new Error('Not authenticated')

      // Update payment intent with selected amount
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/stripe-tip-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tourParticipantId,
            amount,
            currency: guideCurrency,
          }),
        }
      )
      const { paymentIntent, error } = await response.json()
      if (error) throw new Error(error)

      // Present payment sheet
      const { error: paymentError } = await presentPaymentSheet()
      if (paymentError) {
        if (paymentError.code === 'Canceled') {
          // User canceled the payment
          return
        }
        throw paymentError
      }

      // Payment successful
      Alert.alert('Success', 'Thank you for your tip!')
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Something went wrong'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Leave a Tip</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary.main} />
      ) : (
        <View style={styles.tipOptions}>
          <TouchableOpacity
            style={[styles.tipButton, !paymentSheetReady && styles.disabledButton]}
            onPress={() => handleTip(500)}
            disabled={!paymentSheetReady || loading}
          >
            <Text style={styles.tipButtonText}>{formatCurrency(500, guideCurrency)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipButton, !paymentSheetReady && styles.disabledButton]}
            onPress={() => handleTip(1000)}
            disabled={!paymentSheetReady || loading}
          >
            <Text style={styles.tipButtonText}>{formatCurrency(1000, guideCurrency)}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipButton, !paymentSheetReady && styles.disabledButton]}
            onPress={() => handleTip(2000)}
            disabled={!paymentSheetReady || loading}
          >
            <Text style={styles.tipButtonText}>{formatCurrency(2000, guideCurrency)}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    padding: spacing.medium,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.medium,
    color: colors.text.primary,
  },
  tipOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: spacing.small,
  },
  tipButton: {
    backgroundColor: colors.primary.main,
    padding: spacing.medium,
    borderRadius: borderRadius.medium,
    minWidth: 100,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  tipButtonText: {
    color: colors.text.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
})
```

### 5. Webhook Handling

Create a new webhook handler for payment events:

```typescript
// supabase/functions/stripe-payment-webhook/index.ts
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
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        // Update tip record
        await supabase
          .from('tour_tips')
          .update({
            status: 'succeeded',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', paymentIntent.id)
        break

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent
        // Update tip record
        await supabase
          .from('tour_tips')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', failedPaymentIntent.id)
        break

      case 'payment_intent.processing':
        const processingPaymentIntent = event.data.object as Stripe.PaymentIntent
        // Update tip record
        await supabase
          .from('tour_tips')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', processingPaymentIntent.id)
        break

      case 'payment_intent.requires_payment_method':
        const requiresPaymentMethodIntent = event.data.object as Stripe.PaymentIntent
        // Update tip record
        await supabase
          .from('tour_tips')
          .update({
            status: 'requires_payment_method',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', requiresPaymentMethodIntent.id)
        break

      case 'payment_intent.requires_confirmation':
        const requiresConfirmationIntent = event.data.object as Stripe.PaymentIntent
        // Update tip record
        await supabase
          .from('tour_tips')
          .update({
            status: 'requires_confirmation',
            updated_at: new Date().toISOString(),
          })
          .eq('payment_intent_id', requiresConfirmationIntent.id)
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

This webhook handler:
1. Listens for all relevant payment intent events
2. Updates the tour participant record with the appropriate status
3. Handles different payment states (succeeded, failed, processing, requires payment method, requires confirmation)
4. Includes proper error handling and signature verification

You'll need to:
1. Deploy this webhook handler to Supabase
2. Configure the webhook endpoint in your Stripe Dashboard
3. Add the webhook secret to your Supabase environment variables

The webhook URL will be:
```
https://<your-project-ref>.supabase.co/functions/v1/stripe-payment-webhook
```

### 6. Testing Plan

1. **Integration Tests**
   - Test tip payment flow with test cards
   - Verify application fee calculation
   - Test webhook handling
   - Test error scenarios
   - Test currency conversions
   - Test different guide currencies
   - Verify RLS policies work correctly
   - Test duplicate tip prevention

2. **Test Cards**
   - Use Stripe test mode
   - Test successful payments
   - Test failed payments
   - Test various card types
   - Test different currencies

### 7. Deployment Checklist

1. **Environment Setup**
   - Verify Stripe keys in Supabase environment
   - Configure webhook endpoints
   - Set up proper CORS and security headers
   - Set platform's default currency

2. **Database Migration**
   - Create new tour_tips table
   - Update RLS policies
   - Verify data integrity
   - Plan production migration
   - Update existing guides with default currencies

3. **Monitoring**
   - Set up error tracking
   - Monitor payment success rates
   - Track tip amounts and frequencies
   - Monitor currency conversion rates
   - Track application fees in different currencies
   - Monitor RLS policy effectiveness

## Next Steps

1. Implement database migrations
2. Deploy Supabase Function for tip payments
3. Add tipping UI to tour rating screen
4. Update webhook handler
5. Test in development environment
6. Deploy to staging
7. Test with real accounts
8. Deploy to production
9. Monitor and maintain 