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
import { usePlaidLink as usePlaidLinkSDK, PlaidLinkOnSuccess, PlaidLinkOnExit, PlaidLinkOnEvent } from 'react-plaid-link';
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
  // OAuth Redirect Detection
  // When banks like Chase use OAuth, the browser redirects away and back.
  // We use localStorage (NOT sessionStorage) because OAuth banks may
  // open in a NEW TAB — sessionStorage is per-tab and wouldn't persist.
  // We ONLY treat it as an OAuth redirect if oauth_state_id is in the URL.
  // =====================================================

  const isOAuthRedirect = useRef(false);
  const receivedRedirectUri = useRef<string | undefined>(undefined);

  useEffect(() => {
    console.log('[Plaid] 🔍 Mount URL:', window.location.href);

    const params = new URLSearchParams(window.location.search);
    const hasOAuthStateId = !!params.get('oauth_state_id');
    const oauthPendingTimestamp = localStorage.getItem('plaid_oauth_pending');
    const hasOAuthPending = !!oauthPendingTimestamp;

    if (hasOAuthStateId) {
      // Valid OAuth redirect — oauth_state_id present in URL
      console.log('[Plaid] 🔄 OAuth redirect detected!', {
        oauth_state_id: params.get('oauth_state_id'),
      });
      isOAuthRedirect.current = true;
      receivedRedirectUri.current = window.location.href;
      localStorage.removeItem('plaid_oauth_pending');
    } else if (hasOAuthPending) {
      // Check if the flag is fresh (set within last 10 seconds) or stale
      const flagAge = Date.now() - Number(oauthPendingTimestamp);
      const isFreshFlag = flagAge < 10_000; // Less than 10 seconds old

      if (isFreshFlag) {
        // OAuth is CURRENTLY opening — do NOT clear the flag or link token!
        // The browser will navigate away shortly to the bank's OAuth page.
        console.log('[Plaid] 🔑 OAuth is currently opening (flag age:', Math.round(flagAge / 1000), 's). Keeping flag for redirect.');
      } else {
        // Stale flag (>10s old) — user came back without completing OAuth
        console.log('[Plaid] ⚠️ Stale OAuth pending flag found (', Math.round(flagAge / 1000), 's old, no oauth_state_id). Clearing and starting fresh.');
        localStorage.removeItem('plaid_oauth_pending');
        localStorage.removeItem('plaid_link_token');
      }
    }
  }, []);

  // =====================================================
  // Step 1: Create Link Token
  // =====================================================

  const initializeLinkToken = useCallback(async () => {
    if (!userId) return;

    // If OAuth is currently opening (fresh flag), don't create a new token
    const pendingTimestamp = localStorage.getItem('plaid_oauth_pending');
    if (pendingTimestamp && (Date.now() - Number(pendingTimestamp)) < 10_000) {
      console.log('[Plaid] ⏳ OAuth is currently opening. Skipping link token creation.');
      return;
    }

    // If returning from OAuth redirect, restore the stored link token
    if (isOAuthRedirect.current) {
      const storedToken = localStorage.getItem('plaid_link_token');
      if (storedToken) {
        console.log('[Plaid] 🔄 Restoring link token from localStorage for OAuth completion');
        setState((prev) => ({
          ...prev,
          step: 'ready',
          linkToken: storedToken,
        }));
        return;
      }
    }

    setState((prev) => ({ ...prev, step: 'creating_token', error: null }));

    try {
      // Pass redirect_uri for OAuth banks (Chase, Wells Fargo, etc.)
      // Registered in Plaid Dashboard → Developers → API → Allowed redirect URIs
      const redirectUri = 'https://www.hushhtech.com/onboarding/financial-link';
      console.log('[Plaid] Creating link token with redirectUri:', redirectUri);
      const response = await createLinkToken(userId, userEmail, redirectUri);

      // Store link token in localStorage for cross-tab OAuth redirect recovery
      localStorage.setItem('plaid_link_token', response.link_token);

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

    // Clean up OAuth storage after successful connection
    localStorage.removeItem('plaid_oauth_pending');
    localStorage.removeItem('plaid_link_token');

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

  const handlePlaidExit: PlaidLinkOnExit = useCallback((err, metadata) => {
    console.log('[Plaid] 🚪 onExit called', {
      error: err,
      status: metadata?.status,
      institution: metadata?.institution,
      linkSessionId: metadata?.link_session_id,
    });

    if (err) {
      setState((prev) => ({
        ...prev,
        step: 'error',
        error: `Bank connection was interrupted: ${err.display_message || err.error_message || 'Unknown error'}`,
      }));
    } else {
      console.log('[Plaid] User closed Plaid Link without error. Status:', metadata?.status);
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
  // Plaid Link Event Handler — logs ALL events
  // =====================================================

  const handlePlaidEvent: PlaidLinkOnEvent = useCallback((eventName, metadata) => {
    console.log(`[Plaid] 📡 Event: ${eventName}`, metadata);

    // When OAuth opens, set a flag WITH TIMESTAMP so we can detect the redirect back
    // The timestamp prevents the stale-flag detection from clearing it during
    // the same render cycle (before the browser actually navigates away)
    if (eventName === 'OPEN_OAUTH') {
      console.log('[Plaid] 🔑 Setting OAuth pending flag in localStorage (cross-tab)');
      localStorage.setItem('plaid_oauth_pending', Date.now().toString());
    }
  }, []);

  // =====================================================
  // Plaid Link SDK
  // =====================================================

  const { open, ready } = usePlaidLinkSDK({
    token: state.linkToken,
    onSuccess: handlePlaidSuccess,
    onExit: handlePlaidExit,
    onEvent: handlePlaidEvent,
    // Pass receivedRedirectUri when returning from OAuth redirect
    // This tells the SDK to complete the OAuth flow
    receivedRedirectUri: receivedRedirectUri.current,
  });

  // Auto-open Plaid Link when returning from OAuth redirect
  useEffect(() => {
    if (isOAuthRedirect.current && ready && state.linkToken) {
      console.log('[Plaid] 🔄 Auto-opening Plaid Link to complete OAuth flow');
      setState((prev) => ({ ...prev, step: 'linking' }));
      open();
      // Clean up the URL to remove oauth_state_id
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('oauth_state_id');
      window.history.replaceState({}, '', cleanUrl.toString());
    }
  }, [ready, state.linkToken, open]);

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
