# Stripe Integration for Tour Guide Tipping

## Overview
This document outlines the implementation of Stripe Connect for handling tour guide tips in our platform. The integration uses Stripe's hosted onboarding and dashboard access to simplify the implementation while maintaining security and compliance.

## Core Components

### 1. Stripe Connect Setup
- **Connected Accounts**: Tour guides will have their own Stripe accounts
- **Hosted Onboarding**: Using Stripe's hosted onboarding flow for quick integration
- **Dashboard Access**: Tour guides get access to their own Stripe dashboard
- **Direct Charges**: Platform charges with application fees
- **Fee Structure**: Connected accounts (tour guides) pay Stripe fees
- **Negative Balance Handling**: Using Stripe's negative balance liability model

## Implementation Steps

### 1. Connected Accounts Onboarding

#### Prerequisites
- Stripe account with Connect enabled
- Platform account ID from Stripe
- Webhook endpoint for handling account updates

#### Process
1. Create a Stripe Connect account link for tour guides
2. Guide completes Stripe's hosted onboarding
3. Store the connected account ID in our database
4. Handle webhook events for account updates

```typescript
// Example account creation
const account = await stripe.accounts.create({
  type: 'express',
  email: guideEmail,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true }
  },
  business_profile: {
    name: guideName,
    // Additional business details
  }
});
```

### 2. Accepting Payments

#### Process
1. Create a payment intent with the connected account
2. Include application fee
3. Handle payment confirmation
4. Process webhook events

```typescript
// Example payment intent creation
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: 'usd',
  application_fee_amount: feeAmount,
  transfer_data: {
    destination: connectedAccountId,
  },
  // Additional payment details
});
```

### 3. Stripe Dashboard Setup

#### Features
- Real-time balance tracking
- Transaction history
- Payout management
- Dispute handling
- Analytics and reporting

#### Implementation
1. Generate dashboard link for tour guides
2. Handle dashboard access permissions
3. Implement dashboard refresh tokens

```typescript
// Example dashboard link generation
const dashboardLink = await stripe.accounts.createLoginLink(
  connectedAccountId,
  {
    redirect_url: 'https://your-app.com/dashboard-callback'
  }
);
```

### 4. Merchant Risk Responsibilities

#### Platform Responsibilities
- Verify tour guide identity
- Monitor transaction patterns
- Handle disputes and refunds
- Maintain compliance with Stripe's terms

#### Tour Guide Responsibilities
- Provide accurate business information
- Maintain sufficient balance for refunds
- Respond to disputes promptly
- Follow Stripe's terms of service

### 5. Payout Process

#### Automatic Payouts
- Configure payout schedule
- Set minimum payout amount
- Handle failed payouts
- Monitor payout status

#### Manual Payouts
- Allow manual payout requests
- Verify payout eligibility
- Process payout requests
- Handle payout failures

## Database Schema Updates

```sql
-- Tour guides table
ALTER TABLE tour_guides
ADD COLUMN stripe_account_id TEXT,
ADD COLUMN stripe_account_status TEXT,
ADD COLUMN stripe_account_enabled BOOLEAN DEFAULT false;

-- Tips table
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID REFERENCES tours(id),
  guide_id UUID REFERENCES tour_guides(id),
  amount INTEGER NOT NULL,
  application_fee INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Webhook Events to Handle

1. `account.updated`
2. `account.application.deauthorized`
3. `payment_intent.succeeded`
4. `payment_intent.payment_failed`
5. `payout.paid`
6. `payout.failed`
7. `charge.dispute.created`
8. `charge.refunded`

## Security Considerations

1. **API Key Management**
   - Store API keys securely
   - Use environment variables
   - Rotate keys regularly

2. **Webhook Security**
   - Verify webhook signatures
   - Use HTTPS endpoints
   - Implement retry logic

3. **Data Protection**
   - Encrypt sensitive data
   - Implement access controls
   - Regular security audits

## Testing

1. **Test Mode**
   - Use Stripe test mode for development
   - Test all payment scenarios
   - Verify webhook handling

2. **Test Cards**
   - Use Stripe's test card numbers
   - Test various payment methods
   - Test error scenarios

## Monitoring and Maintenance

1. **Logging**
   - Log all Stripe interactions
   - Monitor error rates
   - Track payment success rates

2. **Alerts**
   - Set up error notifications
   - Monitor failed payments
   - Track dispute rates

3. **Regular Reviews**
   - Review transaction patterns
   - Update security measures
   - Monitor compliance

## Next Steps

1. Set up Stripe Connect account
2. Implement account creation flow
3. Develop payment processing
4. Set up webhook handling
5. Implement dashboard access
6. Test thoroughly
7. Deploy to production
8. Monitor and maintain 