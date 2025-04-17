import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface FeeStructure {
  percentage_fee: number;
  fixed_fee: number;
  currency_code: string;
}

export interface FeeCalculation {
  tipAmount: number;
  processingFee: number;
  platformFee: number;
  totalAmount: number;
}

const PLATFORM_FEE_PERCENTAGE = 0.075; // 7.5% platform fee

export async function getFeeStructure(supabase: SupabaseClient, currency: string): Promise<FeeStructure | null> {
  const { data, error } = await supabase
    .from('currency_fee_structures')
    .select('*')
    .eq('currency_code', currency.toLowerCase())
    .eq('is_active', true)
    .single();
  
  if (error || !data) {
    console.error('Error fetching fee structure:', error);
    return null;
  }
  
  return {
    percentage_fee: data.percentage_fee,
    fixed_fee: data.fixed_fee,
    currency_code: data.currency_code
  };
}

export function calculateFees(tipAmount: number, feeStructure: FeeStructure): FeeCalculation {
  // Calculate Stripe's processing fee (percentage + fixed)
  const processingFee = Math.round((tipAmount * feeStructure.percentage_fee) + feeStructure.fixed_fee);
  
  // Calculate platform fee (7.5%)
  const platformFee = Math.round(tipAmount * PLATFORM_FEE_PERCENTAGE);
  
  // Calculate total amount including all fees
  const totalAmount = tipAmount + processingFee + platformFee;
  
  return {
    tipAmount,
    processingFee,
    platformFee,
    totalAmount
  };
}

// Validation functions
export function validateTipAmount(amount: number): boolean {
  const MIN_TIP_AMOUNT = 100; // $1.00 or £1.00 etc in cents
  const MAX_TIP_AMOUNT = 1000000; // $10,000.00 or £10,000.00 etc in cents
  
  return amount >= MIN_TIP_AMOUNT && amount <= MAX_TIP_AMOUNT;
}

export function validateCurrency(currency: string): boolean {
  // List of supported currencies
  const SUPPORTED_CURRENCIES = ['gbp', 'usd', 'eur'];
  return SUPPORTED_CURRENCIES.includes(currency.toLowerCase());
} 