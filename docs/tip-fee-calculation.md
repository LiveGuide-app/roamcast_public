# Tip Fee Calculation

## Overview
This document outlines how tip amounts and processing fees are calculated and presented to guests. The key principle is that guides receive 100% of the tip amount, while processing fees are added on top and paid by the guest.

## Fee Structure
Fees are stored in the `currency_fee_structures` table with the following fields:
- `currency_code`: The currency for this fee structure (e.g., 'gbp', 'usd')
- `percentage_fee`: The Stripe processing fee percentage (e.g., 2.9%)
- `fixed_fee`: The fixed fee per transaction (e.g., 0.30)
- `is_active`: Whether this fee structure is currently active

The platform fee is consistently 7.5%

## Calculation Process

### 1. Base Calculation
For a desired tip amount T:
```
processing_fee = (T * percentage_fee) + fixed_fee
platform_fee = T * 0.075  // 7.5% platform fee
total_fees = processing_fee + platform_fee
total_amount = T + total_fees
```

### 2. Example Calculations

#### Example 1: £10.00 Tip
Given:
- Stripe fee: 2.9%
- Fixed fee: £0.30
- Platform fee: 7.5%

```
processing_fee = (£10.00 * 0.029) + £0.30 = £0.59
platform_fee = £10.00 * 0.075 = £0.75
total_fees = £0.59 + £0.75 = £1.34
total_amount = £10.00 + £1.34 = £11.34
```

#### Example 2: £50.00 Tip
```
processing_fee = (£50.00 * 0.029) + £0.30 = £1.75
platform_fee = £50.00 * 0.075 = £3.75
total_fees = £1.75 + £3.75 = £5.50
total_amount = £50.00 + £5.50 = £55.50
```

## Guest Presentation
When a guest selects or enters a tip amount, we show:

```
Tip Amount: £50.00
Processing Fees: £5.50
Total Amount: £55.50

Your guide will receive the full tip amount of £50.00
```

## Implementation Notes

1. **Fee Lookup**
   - Fetch the active fee structure for the guide's currency from `currency_fee_structures`
   - Cache the fee structure to avoid repeated database lookups

2. **Real-time Calculation**
   - Calculate fees as the guest types/selects tip amount
   - Update the display immediately to show new total

3. **Database Storage**
   - Store both the tip amount and the fees separately in the `tour_tips` table
   - This allows for accurate reporting and reconciliation

4. **Edge Cases**
   - Minimum tip amount should be enforced to ensure fees don't become too large a percentage
   - Maximum tip amount should be enforced based on Stripe limits
   - Handle cases where fee structure is not found for a currency

## Technical Implementation

### Database Updates Needed
```sql
-- Add columns to tour_tips table if not exists
ALTER TABLE tour_tips
ADD COLUMN IF NOT EXISTS processing_fee_amount integer,
ADD COLUMN IF NOT EXISTS platform_fee_amount integer;
```

### Fee Calculation Function
```typescript
interface FeeStructure {
  percentage_fee: number;
  fixed_fee: number;
  platform_fee: number;
  currency_code: string;
}

interface FeeCalculation {
  tipAmount: number;
  processingFee: number;
  platformFee: number;
  totalAmount: number;
}

function calculateFees(tipAmount: number, feeStructure: FeeStructure): FeeCalculation {
  const processingFee = Math.round((tipAmount * feeStructure.percentage_fee) + feeStructure.fixed_fee);
  const platformFee = Math.round(tipAmount * feeStructure.platform_fee);
  
  return {
    tipAmount,
    processingFee,
    platformFee,
    totalAmount: tipAmount + processingFee + platformFee
  };
}
```

### Payment Flow
1. Guest enters/selects tip amount
2. System calculates fees using active fee structure
3. Guest confirms total amount (tip + fees)
4. Payment intent created with full amount
5. Guide receives full tip amount
6. Platform receives fees

### Error Handling
- Invalid/missing fee structure
- Currency mismatches
- Minimum/maximum tip amount violations
- Failed fee calculations 

## Implementation Plan

### Phase 1: Database Setup
1. Create currency_fee_structures table if not exists:
```sql
CREATE TABLE currency_fee_structures (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  currency_code varchar NOT NULL,
  percentage_fee numeric NOT NULL,
  fixed_fee numeric NOT NULL,
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- Add unique constraint for active fee structure per currency
CREATE UNIQUE INDEX currency_fee_structures_active_currency 
ON currency_fee_structures(currency_code) 
WHERE is_active = true;
```

2. Add processing fee columns to tour_tips:
```sql
ALTER TABLE tour_tips
ADD COLUMN IF NOT EXISTS processing_fee_amount integer,
ADD COLUMN IF NOT EXISTS platform_fee_amount integer;
```

### Phase 2: Backend Implementation
1. Create shared fee calculation module in `supabase/functions/_shared/fee-calculation.ts`:
```typescript
interface FeeStructure {
  percentage_fee: number;
  fixed_fee: number;
  currency_code: string;
}

interface FeeCalculation {
  tipAmount: number;
  processingFee: number;
  platformFee: number;
  totalAmount: number;
}

export async function getFeeStructure(supabase: SupabaseClient, currency: string): Promise<FeeStructure | null> {
  const { data, error } = await supabase
    .from('currency_fee_structures')
    .select('*')
    .eq('currency_code', currency.toLowerCase())
    .eq('is_active', true)
    .single();
  
  if (error || !data) return null;
  return data;
}

export function calculateFees(tipAmount: number, feeStructure: FeeStructure): FeeCalculation {
  const processingFee = Math.round((tipAmount * feeStructure.percentage_fee) + feeStructure.fixed_fee);
  const platformFee = Math.round(tipAmount * 0.075); // 7.5% platform fee
  
  return {
    tipAmount,
    processingFee,
    platformFee,
    totalAmount: tipAmount + processingFee + platformFee
  };
}
```

2. Update stripe-tip-payment function to use new fee calculation:
```typescript
// In stripe-tip-payment/index.ts
import { getFeeStructure, calculateFees } from '../_shared/fee-calculation.ts';

// Inside the request handler:
const feeStructure = await getFeeStructure(supabase, guideCurrency);
if (!feeStructure) {
  return new Response(
    JSON.stringify({ error: 'Fee structure not found for currency' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );
}

const fees = calculateFees(amount, feeStructure);

const paymentIntent = await stripe.paymentIntents.create({
  amount: fees.totalAmount,
  currency: guideCurrency,
  application_fee_amount: fees.platformFee,
  // ... rest of the payment intent creation
});

// Update database record with fee breakdown
const { error: tipError } = await supabase
  .from('tour_tips')
  .insert({
    tour_participant_id: tourParticipantId,
    amount: fees.tipAmount,
    currency: guideCurrency,
    payment_intent_id: paymentIntent.id,
    status: paymentIntent.status,
    processing_fee_amount: fees.processingFee,
    platform_fee_amount: fees.platformFee
  });
```

### Phase 3: Frontend Implementation
1. Create fee calculation preview component:
```typescript
// components/TipFeePreview.tsx
interface TipFeePreviewProps {
  tipAmount: number;
  processingFee: number;
  platformFee: number;
  totalAmount: number;
  currency: string;
}

export function TipFeePreview({ 
  tipAmount, 
  processingFee, 
  platformFee, 
  totalAmount, 
  currency 
}: TipFeePreviewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Breakdown</Text>
      <View style={styles.row}>
        <Text>Tip Amount:</Text>
        <Text>{formatCurrency(tipAmount, currency)}</Text>
      </View>
      <View style={styles.row}>
        <Text>Processing Fee:</Text>
        <Text>{formatCurrency(processingFee + platformFee, currency)}</Text>
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalText}>Total:</Text>
        <Text style={styles.totalAmount}>{formatCurrency(totalAmount, currency)}</Text>
      </View>
      <Text style={styles.notice}>
        Your guide will receive the full tip amount of {formatCurrency(tipAmount, currency)}
      </Text>
    </View>
  );
}
```

2. Update TipPayment component to show fee preview:
```typescript
// In TipPayment.tsx
const [fees, setFees] = useState<FeeCalculation | null>(null);

// Add fee calculation when amount changes
const handleAmountChange = async (amount: number) => {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/calculate-fees`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: guideCurrency })
      }
    );
    const fees = await response.json();
    setFees(fees);
  } catch (error) {
    console.error('Error calculating fees:', error);
  }
};

// In the render:
{fees && (
  <TipFeePreview
    tipAmount={fees.tipAmount}
    processingFee={fees.processingFee}
    platformFee={fees.platformFee}
    totalAmount={fees.totalAmount}
    currency={guideCurrency}
  />
)}
```

### Phase 4: Testing and Deployment
1. **Initial Setup**
   - Add test fee structures for common currencies (GBP, USD, EUR)
   - Verify fee calculations match Stripe's actual fees

2. **Testing Checklist**
   - [ ] Test fee calculations for different amounts
   - [ ] Verify platform fee is always 7.5%
   - [ ] Test edge cases (minimum/maximum amounts)
   - [ ] Verify fee preview updates correctly
   - [ ] Test with different currencies
   - [ ] Verify guide receives correct amount
   - [ ] Test error handling for missing fee structures

3. **Deployment Steps**
   ```bash
   # 1. Deploy database changes
   supabase db push

   # 2. Insert initial fee structures
   psql -f scripts/insert_fee_structures.sql

   # 3. Deploy updated functions
   supabase functions deploy stripe-tip-payment
   supabase functions deploy calculate-fees

   # 4. Update frontend and deploy
   eas build --platform all
   eas submit --platform all
   ```

### Phase 5: Monitoring and Maintenance
1. Set up monitoring for:
   - Fee calculation accuracy
   - Processing fee vs actual Stripe charges
   - Guide payout amounts
   - Currency conversion rates
   - Error rates in fee calculations

2. Create admin dashboard for:
   - Fee structure management
   - Fee calculation monitoring
   - Guide payout tracking
   - Currency management 