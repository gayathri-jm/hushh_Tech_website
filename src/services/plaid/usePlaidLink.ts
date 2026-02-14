/**
 * usePlaidLink — Custom React hook for Plaid Link integration
 * 
 * Manages the full flow:
 * 1. Create link token
 * 2. Open Plaid Link
 * 3. Exchange token on success
 * 4. Fetch financial data (Balance, Assets, Investments)
 * 5. Track status of each product independently
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { usePlaidLink as usePlaidLinkSDK, PlaidLinkOnSuccess, PlaidLinkOnExit } from 'react-plaid-link';
import {
  createLinkToken,
  exchangeToken,
  fetchAllFinancialData,
  checkAssetReport,
  getProductStatus,
  saveFinancialDataToSupabase,
  type FinancialDataResponse,
  type ProductFetchStatus,
} from './plaidService';

// =====================================================
// Types
// =====================================================

export interface PlaidLinkState {
  /** Current step in the flow */
  step: 'idle' | 'creating_token' | 'ready' | 'linking' | 'exchanging' | 'fetching' | 'done' | 'error';

  /** Link token for Plaid Link SDK */
  linkToken: string | null;

  /** Error message if something went wrong */
  error: string | null;

  /** Institution info from Plaid Link */
  institution: {
    name: string;
    id: string;
  } | null;

  /** Status of each product fetch */
  balanceStatus: ProductFetchStatus;
  assetsStatus: ProductFetchStatus;
  investmentsStatus: ProductFetchStatus;

  /** Full financial data response */
  financialData: FinancialDataResponse | null;

  /** Whether user can proceed to KYC */
  canProceed: boolean;

  /** Number of products successfully fetched */
  productsAvailable: number;
}

export interface UsePlaidLinkReturn extends PlaidLinkState {
  /** Initialize and open Plaid Link */
  openPlaidLink: () => void;

  /** Retry the entire flow */
  retry: () => void;

  /** Whether Plaid Link is ready to open */
  isReady: boolean;

  /** Open the Plaid Link modal */
  open: () => void;
}

// =====================================================
// Hook
// =====================================================

export const usePlaidLinkHook = (userId: string, userEmail?: string): UsePlaidLinkReturn => {
  const [state, setState] = useState<PlaidLinkState>({
    step: 'idle',
    linkToken: null,
    error: null,
    institution: null,
    balanceStatus: 'idle',
    assetsStatus: 'idle',
    investmentsStatus: 'idle',
    financialData: null,
    canProceed: false,
    productsAvailable: 0,
  });

  // Store access token in ref (not in state — it's sensitive)
  const accessTokenRef = useRef<string | null>(null);
  const assetPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasInitializedRef = useRef(false);

  // =====================================================
  // Step 1: Create Link Token
  // =====================================================

  const initializeLinkToken = useCallback(async () => {
    if (!userId) return;

    setState((prev) => ({ ...prev, step: 'creating_token', error: null }));

    try {
      const response = await createLinkToken(userId, userEmail);
      setState((prev) => ({
        ...prev,
        step: 'ready',
        linkToken: response.link_token,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: err.message || 'Failed to initialize bank connection',
      }));
    }
  }, [userId, userEmail]);

  // Auto-initialize on mount — only once per hook instance
  useEffect(() => {
    if (userId && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      initializeLinkToken();
    }
  }, [userId, initializeLinkToken]);

  // =====================================================
  // Step 2 & 3: Plaid Link Success Handler
  // =====================================================

  const handlePlaidSuccess: PlaidLinkOnSuccess = useCallback(async (publicToken, metadata) => {
    console.log('[Plaid] ✅ onSuccess called', { publicToken: publicToken?.substring(0, 20), metadata: metadata?.institution });

    const institutionInfo = {
      name: metadata.institution?.name || 'Unknown',
      id: metadata.institution?.institution_id || '',
    };

    setState((prev) => ({
      ...prev,
      step: 'exchanging',
      institution: institutionInfo,
      balanceStatus: 'loading',
      assetsStatus: 'loading',
      investmentsStatus: 'loading',
    }));

    try {
      // Exchange token
      console.log('[Plaid] Exchanging token...');
      const exchangeResult = await exchangeToken(
        publicToken,
        userId,
        institutionInfo.name,
        institutionInfo.id,
      );
      console.log('[Plaid] ✅ Exchange success:', { item_id: exchangeResult.item_id, hasAccessToken: !!exchangeResult.access_token });

      accessTokenRef.current = exchangeResult.access_token;

      setState((prev) => ({ ...prev, step: 'fetching' }));

      // Fetch all financial data in parallel (Balance, Assets, Investments)
      console.log('[Plaid] Fetching financial data...');
      const financialResult = await fetchAllFinancialData(
        exchangeResult.access_token,
        userId,
      );
      console.log('[Plaid] ✅ Financial data result:', {
        status: financialResult.status,
        balance: financialResult.balance.available,
        assets: financialResult.assets.available,
        investments: financialResult.investments.available,
        errors: {
          balance: financialResult.balance.error,
          assets: financialResult.assets.error,
          investments: financialResult.investments.error,
        },
      });

      // Determine individual statuses
      const balanceStatus = getProductStatus(financialResult.balance);
      const assetsStatus = getProductStatus(financialResult.assets);
      const investmentsStatus = getProductStatus(financialResult.investments);

      setState((prev) => ({
        ...prev,
        step: 'done',
        financialData: financialResult,
        balanceStatus,
        assetsStatus,
        investmentsStatus,
        canProceed: financialResult.summary.can_proceed,
        productsAvailable: financialResult.summary.products_available,
      }));

      // Save financial data to Supabase (fire-and-forget, non-blocking)
      saveFinancialDataToSupabase(
        userId,
        financialResult,
        institutionInfo.name,
        institutionInfo.id,
        exchangeResult.item_id,
      ).catch((err) => console.warn('[Plaid] Background save failed:', err));

      // If assets are pending, start polling
      if (assetsStatus === 'pending' && financialResult.assets.data?.asset_report_token) {
        startAssetPolling(financialResult.assets.data.asset_report_token);
      }
    } catch (err: any) {
      console.error('[Plaid] ❌ Error in handlePlaidSuccess:', err);
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: err.message || 'Failed to connect to your bank',
        balanceStatus: 'error',
        assetsStatus: 'error',
        investmentsStatus: 'error',
      }));
    }
  }, [userId]);

  // =====================================================
  // Plaid Link Exit Handler
  // =====================================================

  const handlePlaidExit: PlaidLinkOnExit = useCallback((err) => {
    if (err) {
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: `Bank connection was interrupted: ${err.display_message || err.error_message || 'Unknown error'}`,
      }));
    }
    // If user just closed, stay in 'ready' state
  }, []);

  // =====================================================
  // Asset Report Polling
  // =====================================================

  const startAssetPolling = useCallback((assetReportToken: string) => {
    // Clear any existing interval
    if (assetPollIntervalRef.current) {
      clearInterval(assetPollIntervalRef.current);
    }

    let attempts = 0;
    const maxAttempts = 10; // Max ~50 seconds of polling

    assetPollIntervalRef.current = setInterval(async () => {
      attempts++;

      if (attempts > maxAttempts) {
        clearInterval(assetPollIntervalRef.current!);
        assetPollIntervalRef.current = null;
        return;
      }

      try {
        const result = await checkAssetReport(assetReportToken, userId);

        if (result.status === 'complete') {
          clearInterval(assetPollIntervalRef.current!);
          assetPollIntervalRef.current = null;

          setState((prev) => ({
            ...prev,
            assetsStatus: 'success',
            financialData: prev.financialData
              ? {
                  ...prev.financialData,
                  assets: { available: true, data: result.data, error: null, reason: null },
                  summary: {
                    ...prev.financialData.summary,
                    products_available: prev.financialData.summary.products_available + 1,
                  },
                }
              : prev.financialData,
            productsAvailable: (prev.productsAvailable || 0) + 1,
          }));
        }
      } catch {
        // Silent fail on poll — don't disrupt user
      }
    }, 5000); // Poll every 5 seconds
  }, [userId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (assetPollIntervalRef.current) {
        clearInterval(assetPollIntervalRef.current);
      }
    };
  }, []);

  // =====================================================
  // Plaid Link SDK
  // =====================================================

  const { open, ready } = usePlaidLinkSDK({
    token: state.linkToken,
    onSuccess: handlePlaidSuccess,
    onExit: handlePlaidExit,
  });

  // =====================================================
  // Public Methods
  // =====================================================

  const openPlaidLink = useCallback(() => {
    if (ready) {
      setState((prev) => ({ ...prev, step: 'linking' }));
      open();
    }
  }, [ready, open]);

  const retry = useCallback(() => {
    setState({
      step: 'idle',
      linkToken: null,
      error: null,
      institution: null,
      balanceStatus: 'idle',
      assetsStatus: 'idle',
      investmentsStatus: 'idle',
      financialData: null,
      canProceed: false,
      productsAvailable: 0,
    });
    accessTokenRef.current = null;
    hasInitializedRef.current = false;
    initializeLinkToken();
  }, [initializeLinkToken]);

  return {
    ...state,
    openPlaidLink,
    retry,
    isReady: ready && state.step === 'ready',
    open: openPlaidLink,
  };
};

export default usePlaidLinkHook;
