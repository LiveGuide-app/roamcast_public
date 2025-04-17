# Request Validation and Sanitization Guide for Supabase Edge Functions

This guide provides a step-by-step approach to implementing request validation and sanitization in your Supabase Edge Functions for the Roamcast application.

## Overview

Request validation and sanitization are critical security measures that:
- Prevent malformed data from being processed
- Protect against injection attacks
- Ensure data integrity
- Reduce server-side errors
- Improve error messages for clients

## Current Functions in Use

Based on our analysis, the following four functions are actively used in the application:

1. **livekit-token**: Used for generating LiveKit tokens for guides and listeners
2. **stripe-onboarding**: Used for Stripe Connect onboarding for tour guides
3. **stripe-tip-payment**: Used for processing tip payments
4. **stripe-dashboard-link**: Used for generating Stripe dashboard links for guides

## Step 1: Set Up Shared Validation Modules

First, create a shared directory for your validation code:

```bash
mkdir -p supabase/functions/_shared
```

### 1.1: Create the Schemas Module

Create a file `supabase/functions/_shared/schemas.ts`:

```typescript
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// LiveKit-related schemas
export const liveKitTokenSchema = z.object({
  tourId: z.string().uuid(),
  role: z.enum(["guide", "listener"]),
  deviceId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

// Stripe-related schemas
export const stripeOnboardingSchema = z.object({
  userId: z.string().uuid(),
  returnUrl: z.string().url(),
});

export const stripeDashboardLinkSchema = z.object({
  userId: z.string().uuid(),
});

export const tipPaymentSchema = z.object({
  tourId: z.string().uuid(),
  amount: z.number().int().min(100).max(1000000), // Amount in cents
  currency: z.string().length(3), // ISO 4217 currency code
  paymentMethodId: z.string(),
});
```

### 1.2: Create the Validation Helper Module

Create a file `supabase/functions/_shared/validation.ts`:

```typescript
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export function validateRequest<T>(
  data: unknown,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors in a user-friendly way
      const formattedErrors = error.errors.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      }).join(', ');
      return { success: false, error: formattedErrors };
    }
    return { success: false, error: "Invalid request data" };
  }
}
```

### 1.3: Create the Sanitization Module

Create a file `supabase/functions/_shared/sanitization.ts`:

```typescript
export function sanitizeString(input: string): string {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .trim(); // Remove leading/trailing whitespace
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}
```

## Step 2: Update Your Edge Functions

Now, update each of your Edge Functions to use the validation and sanitization modules.

### 2.1: Update the LiveKit Token Function

Update `supabase/functions/livekit-token/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";
import { liveKitTokenSchema } from '../_shared/schemas.ts';
import { validateRequest } from '../_shared/validation.ts';
import { sanitizeObject } from '../_shared/sanitization.ts';

serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse and sanitize request body
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    
    // Validate request data
    const validationResult = validateRequest(sanitizedBody, liveKitTokenSchema);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Use the validated and sanitized data
    const { tourId, role, deviceId, metadata } = validationResult.data;
    
    // Get API credentials
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!apiKey || !apiSecret) {
      throw new Error('Missing LiveKit credentials');
    }

    // Generate token
    const isGuide = role === 'guide';
    const identity = isGuide ? `guide-${tourId}` : `listener-${deviceId}`;
    const name = metadata?.name || role;

    // Create JWT payload
    const payload = {
      video: {
        room: `tour-${tourId}`,
        roomJoin: true,
        canPublish: isGuide,
        canSubscribe: true,
        canPublishData: isGuide,
        canPublishSources: isGuide ? ['microphone'] : undefined
      },
      metadata: JSON.stringify({
        role,
        tourId,
        ...metadata
      }),
      name,
      sub: identity,
      iss: apiKey,
      nbf: getNumericDate(0),
      exp: getNumericDate(21600), // 6 hours
      iat: getNumericDate(0)
    };

    // Sign the JWT
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const token = await create({ alg: 'HS256', typ: 'JWT' }, payload, key);

    return new Response(JSON.stringify({ token }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error generating token:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred generating your token' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 2.2: Update the Stripe Tip Payment Function

Update `supabase/functions/stripe-tip-payment/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { tipPaymentSchema } from '../_shared/schemas.ts';
import { validateRequest } from '../_shared/validation.ts';
import { sanitizeObject } from '../_shared/sanitization.ts';

serve(async (req) => {
  try {
    // Parse and sanitize request body
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    
    // Validate request data
    const validationResult = validateRequest(sanitizedBody, tipPaymentSchema);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Use the validated and sanitized data
    const { tourId, amount, currency, paymentMethodId } = validationResult.data;
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // Get the tour guide's Stripe account ID
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('guide_id')
      .eq('id', tourId)
      .single();
      
    if (tourError || !tour) {
      return new Response(
        JSON.stringify({ error: 'Tour not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: guide, error: guideError } = await supabase
      .from('tour_guides')
      .select('stripe_account_id')
      .eq('id', tour.guide_id)
      .single();
      
    if (guideError || !guide || !guide.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Guide not found or not connected to Stripe' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: paymentMethodId,
      confirm: true,
      application_fee_amount: Math.round(amount * 0.075), // 7.5% platform fee
      transfer_data: {
        destination: guide.stripe_account_id,
      },
    });
    
    // Record the tip in the database
    const { error: tipError } = await supabase
      .from('tour_tips')
      .insert({
        tour_id: tourId,
        amount,
        currency,
        payment_intent_id: paymentIntent.id,
        status: paymentIntent.status,
      });
      
    if (tipError) {
      console.error('Error recording tip:', tipError);
      return new Response(
        JSON.stringify({ error: 'Error recording tip' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing payment:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your payment' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 2.3: Update the Stripe Onboarding Function

Update `supabase/functions/stripe-onboarding/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { stripeOnboardingSchema } from '../_shared/schemas.ts';
import { validateRequest } from '../_shared/validation.ts';
import { sanitizeObject } from '../_shared/sanitization.ts';

serve(async (req) => {
  try {
    // Parse and sanitize request body
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    
    // Validate request data
    const validationResult = validateRequest(sanitizedBody, stripeOnboardingSchema);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Use the validated and sanitized data
    const { userId, returnUrl } = validationResult.data;
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // Get the user's email
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    
    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${returnUrl}?error=true`,
      return_url: `${returnUrl}?success=true`,
      type: 'account_onboarding',
    });
    
    // Update the user's Stripe account ID
    const { error: updateError } = await supabase
      .from('tour_guides')
      .update({ 
        stripe_account_id: account.id,
        stripe_account_status: 'pending',
      })
      .eq('user_id', userId);
      
    if (updateError) {
      console.error('Error updating guide:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error updating guide' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred creating your Stripe account' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### 2.4: Update the Stripe Dashboard Link Function

Update `supabase/functions/stripe-dashboard-link/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno';
import { stripeDashboardLinkSchema } from '../_shared/schemas.ts';
import { validateRequest } from '../_shared/validation.ts';
import { sanitizeObject } from '../_shared/sanitization.ts';

serve(async (req) => {
  try {
    // Parse and sanitize request body
    const body = await req.json();
    const sanitizedBody = sanitizeObject(body);
    
    // Validate request data
    const validationResult = validateRequest(sanitizedBody, stripeDashboardLinkSchema);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Use the validated and sanitized data
    const { userId } = validationResult.data;
    
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });
    
    // Get the user's Stripe account ID
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { data: guide, error: guideError } = await supabase
      .from('tour_guides')
      .select('stripe_account_id')
      .eq('user_id', userId)
      .single();
      
    if (guideError || !guide || !guide.stripe_account_id) {
      return new Response(
        JSON.stringify({ error: 'Guide not found or not connected to Stripe' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Create a dashboard link
    const link = await stripe.accounts.createLoginLink(guide.stripe_account_id);
    
    return new Response(
      JSON.stringify({ url: link.url }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating dashboard link:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred creating your dashboard link' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

## Step 3: Test Your Validation

To test your validation, you can use tools like Postman or curl to send requests with invalid data:

```bash
# Example of an invalid LiveKit token request
curl -X POST https://your-project.supabase.co/functions/v1/livekit-token \
  -H "Content-Type: application/json" \
  -d '{
    "tourId": "not-a-uuid",
    "role": "invalid-role",
    "deviceId": ""
  }'
```

You should receive a response like:

```json
{
  "error": "tourId: Invalid uuid, role: Invalid enum value. Expected 'guide' | 'listener', received 'invalid-role'"
}
```

## Step 4: Deploy Your Changes

Deploy your changes to Supabase:

```bash
supabase functions deploy livekit-token
supabase functions deploy stripe-tip-payment
supabase functions deploy stripe-onboarding
supabase functions deploy stripe-dashboard-link
```

## Step 5: Monitor and Refine

After deploying, monitor your functions for validation errors and refine your schemas as needed:

1. Check the Supabase logs for validation errors
2. Update your schemas based on real-world usage
3. Add more specific validation rules as you learn more about your data

## Conclusion

By implementing request validation and sanitization in your Supabase Edge Functions, you've significantly improved the security and reliability of your API. This will help prevent errors, protect against attacks, and provide better error messages for your clients.

Remember to keep your validation schemas up to date as your application evolves, and consider adding more sophisticated validation rules as needed. 