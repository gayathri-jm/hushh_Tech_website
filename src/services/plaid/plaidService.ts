/**
 * Plaid Service — Client-side API calls to Supabase Edge Functions
 * 
 * Calls production Supabase Edge Functions for Plaid operations.
 * All sensitive operations happen server-side in Edge Functions.
 * This service only sends requests with proper auth headers.
 */

// =====================================================
// Types
// =====================================================

export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
}

export interface PlaidExchangeResponse {
  access_token: string;
  item_id: string;
  record_id?: string | null;
}

/** Status of a single financial product fetch */
export type ProductFetchStatus = 'idle' | 'loading' | 'success' | 'unavailable' | 'error' | 'pending';

/** Result for a single product */
export interface ProductResult {
  available: boolean;
  data: any | null;
  error: string | null;
  reason: 'not_supported' | 'error' | null;
}

/** Full financial data response */
export interface FinancialDataResponse {
  status: 'complete' | 'partial' | 'failed';
  balance: ProductResult;
  assets: ProductResult;
  investments: ProductResult;
  summary: {
    products_available: number;
    products_total: number;
    can_proceed: boolean;
  };
}

/** Asset report poll response */
export interface AssetReportPollResponse {
  status: 'complete' | 'pending';
  data?: any;
  message?: string;
}

// =====================================================
// Supabase Edge Function Base URL + Auth
// =====================================================

const SUPABASE_URL = 'https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1';

/** Get the Supabase anon key from env */
const getAnonKey = (): string => {
  try {
    // @ts-ignore - Vite env
    return import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
  } catch {
    return '';
  }
};

/** Standard headers for all Supabase Edge Function calls */
const getHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAnonKey()}`,
});

// =====================================================
// Service Functions
// =====================================================

/**
 * Create a Plaid Link token for initializing Plaid Link
 * Calls: Supabase Edge Function `create-link-token`
 */
export const createLinkToken = async (
  userId: string,
  userEmail?: string,
): Promise<PlaidLinkTokenResponse> => {
  const response = await fetch(`${SUPABASE_URL}/create-link-token`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ userId, userEmail }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to create link token' }));
    throw new Error(error.details || error.error || 'Failed to create link token');
  }

  return response.json();
};

/**
 * Exchange public_token for access_token after Plaid Link success
 * Calls: Supabase Edge Function `exchange-public-token`
 */
export const exchangeToken = async (
  publicToken: string,
  userId: string,
  institutionName?: string,
  institutionId?: string,
): Promise<PlaidExchangeResponse> => {
  const response = await fetch(`${SUPABASE_URL}/exchange-public-token`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      publicToken,
      userId,
      institutionName,
      institutionId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to exchange token' }));
    throw new Error(error.details || error.error || 'Failed to exchange token');
  }

  return response.json();
};

/**
 * Fetch account balances
 * Calls: Supabase Edge Function `get-balance`
 */
export const fetchBalance = async (
  accessToken: string,
  userId: string,
): Promise<ProductResult> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/get-balance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ accessToken, userId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      // Check if product not supported
      if (err.error_code === 'PRODUCTS_NOT_SUPPORTED' || response.status === 400) {
        return { available: false, data: null, error: null, reason: 'not_supported' };
      }
      return { available: false, data: null, error: err.error || 'Failed to fetch balance', reason: 'error' };
    }

    const data = await response.json();
    return { available: true, data, error: null, reason: null };
  } catch (err: any) {
    return { available: false, data: null, error: err.message, reason: 'error' };
  }
};

/**
 * Create an asset report
 * Calls: Supabase Edge Function `asset-report-create`
 */
export const fetchAssets = async (
  accessToken: string,
  userId: string,
): Promise<ProductResult> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/asset-report-create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ accessToken, userId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (err.error_code === 'PRODUCTS_NOT_SUPPORTED' || response.status === 400) {
        return { available: false, data: null, error: null, reason: 'not_supported' };
      }
      return { available: false, data: null, error: err.error || 'Failed to fetch assets', reason: 'error' };
    }

    const data = await response.json();

    // Asset reports can be async (pending)
    if (data.status === 'pending') {
      return { available: false, data, error: null, reason: null };
    }

    return { available: true, data, error: null, reason: null };
  } catch (err: any) {
    return { available: false, data: null, error: err.message, reason: 'error' };
  }
};

/**
 * Fetch investment holdings
 * Calls: Supabase Edge Function `investments-holdings`
 */
export const fetchInvestments = async (
  accessToken: string,
  userId: string,
): Promise<ProductResult> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/investments-holdings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ accessToken, userId }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (err.error_code === 'PRODUCTS_NOT_SUPPORTED' || response.status === 400) {
        return { available: false, data: null, error: null, reason: 'not_supported' };
      }
      return { available: false, data: null, error: err.error || 'Failed to fetch investments', reason: 'error' };
    }

    const data = await response.json();
    return { available: true, data, error: null, reason: null };
  } catch (err: any) {
    return { available: false, data: null, error: err.message, reason: 'error' };
  }
};

/**
 * Fetch all 3 financial products in parallel
 * Calls get-balance, asset-report-create, investments-holdings simultaneously
 */
export const fetchAllFinancialData = async (
  accessToken: string,
  userId: string,
): Promise<FinancialDataResponse> => {
  const [balanceResult, assetsResult, investmentsResult] = await Promise.allSettled([
    fetchBalance(accessToken, userId),
    fetchAssets(accessToken, userId),
    fetchInvestments(accessToken, userId),
  ]);

  // Parse settled results
  const balance: ProductResult = balanceResult.status === 'fulfilled'
    ? balanceResult.value
    : { available: false, data: null, error: 'Network error', reason: 'error' };

  const assets: ProductResult = assetsResult.status === 'fulfilled'
    ? assetsResult.value
    : { available: false, data: null, error: 'Network error', reason: 'error' };

  const investments: ProductResult = investmentsResult.status === 'fulfilled'
    ? investmentsResult.value
    : { available: false, data: null, error: 'Network error', reason: 'error' };

  // Count available products
  const productsAvailable = [balance, assets, investments].filter((r) => r.available).length;

  return {
    status: productsAvailable === 3 ? 'complete' : productsAvailable > 0 ? 'partial' : 'failed',
    balance,
    assets,
    investments,
    summary: {
      products_available: productsAvailable,
      products_total: 3,
      can_proceed: productsAvailable >= 1,
    },
  };
};

/**
 * Check asset report status (for async asset reports)
 * Calls: Supabase Edge Function `asset-report-create` with report token
 */
export const checkAssetReport = async (
  assetReportToken: string,
  userId: string,
): Promise<AssetReportPollResponse> => {
  const response = await fetch(`${SUPABASE_URL}/asset-report-create`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ assetReportToken, userId, action: 'get' }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to check asset report' }));
    throw new Error(error.details || error.error || 'Failed to check asset report');
  }

  return response.json();
};

// =====================================================
// Save to Supabase
// =====================================================

/**
 * Save financial data (Balance, Assets, Investments) to Supabase
 * Upserts into `user_financial_data` table
 */
export const saveFinancialDataToSupabase = async (
  userId: string,
  data: FinancialDataResponse,
  institutionName?: string,
  institutionId?: string,
  itemId?: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Dynamic import to avoid circular deps
    const config = (await import('../../resources/config/config')).default;
    const supabase = config.supabaseClient;

    if (!supabase) {
      console.warn('[Plaid] Supabase client not available — skipping save');
      return { success: false, error: 'Supabase client not initialized' };
    }

    const row = {
      user_id: userId,
      plaid_item_id: itemId || null,
      institution_name: institutionName || null,
      institution_id: institutionId || null,
      balances: data.balance.available ? data.balance.data : null,
      asset_report: data.assets.available ? data.assets.data : null,
      asset_report_token: data.assets.data?.asset_report_token || null,
      investments: data.investments.available ? data.investments.data : null,
      available_products: {
        balance: data.balance.available,
        assets: data.assets.available,
        investments: data.investments.available,
      },
      status: data.status,
      fetch_errors: buildFetchErrors(data),
      updated_at: new Date().toISOString(),
    };

    // Upsert — update if user already has a record, insert otherwise
    const { error } = await supabase
      .from('user_financial_data')
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      // If upsert with onConflict fails (no unique constraint), try insert
      if (error.code === '42P10' || error.message?.includes('unique')) {
        const { error: insertError } = await supabase
          .from('user_financial_data')
          .insert(row);

        if (insertError) {
          console.error('[Plaid] Failed to save financial data:', insertError);
          return { success: false, error: insertError.message };
        }
      } else {
        console.error('[Plaid] Failed to save financial data:', error);
        return { success: false, error: error.message };
      }
    }

    console.log('[Plaid] ✅ Financial data saved to Supabase', {
      userId,
      institution: institutionName,
      balance: data.balance.available,
      assets: data.assets.available,
      investments: data.investments.available,
    });

    return { success: true };
  } catch (err: any) {
    console.error('[Plaid] Error saving financial data:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Build fetch_errors JSONB from product results
 */
const buildFetchErrors = (data: FinancialDataResponse): Record<string, string> | null => {
  const errors: Record<string, string> = {};

  if (data.balance.error) errors.balance = data.balance.error;
  if (data.assets.error) errors.assets = data.assets.error;
  if (data.investments.error) errors.investments = data.investments.error;

  if (data.balance.reason === 'not_supported') errors.balance = 'Product not supported';
  if (data.assets.reason === 'not_supported') errors.assets = 'Product not supported';
  if (data.investments.reason === 'not_supported') errors.investments = 'Product not supported';

  return Object.keys(errors).length > 0 ? errors : null;
};

// =====================================================
// Utility Functions
// =====================================================

/**
 * Format currency amount for display
 */
export const formatCurrency = (amount: number | null | undefined, currency = 'USD'): string => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get display-friendly status for a product
 */
export const getProductStatus = (product: ProductResult): ProductFetchStatus => {
  if (product.available) {
    if (product.data?.status === 'pending') return 'pending';
    return 'success';
  }
  if (product.reason === 'not_supported') return 'unavailable';
  if (product.error) return 'error';
  // Check if it's a pending asset report
  if (product.data?.status === 'pending') return 'pending';
  return 'idle';
};

/**
 * Get the header title based on how many products are available
 */
export const getHeaderTitle = (availableCount: number): string => {
  switch (availableCount) {
    case 3: return '✨ Complete Financial Profile';
    case 2: return '📊 Financial Profile Verified';
    case 1: return '💰 Account Verified';
    case 0: return '⚠️ Unable to Verify';
    default: return '💰 Financial Verification';
  }
};
