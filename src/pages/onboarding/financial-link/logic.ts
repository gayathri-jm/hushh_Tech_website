/**
 * FinancialLink — All Business Logic
 * Pre-onboarding financial verification via Plaid.
 * Uses usePlaidLinkHook for the full Plaid Link flow.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../../resources/config/config';
import { usePlaidLinkHook } from '../../../services/plaid/usePlaidLink';
import { formatCurrency } from '../../../services/plaid/plaidService';
import type { FinancialVerificationResult } from '../../../types/kyc';

export { formatCurrency };

export const useFinancialLinkLogic = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const hasInitialized = useRef(false);

  /* Scroll to top */
  useEffect(() => { window.scrollTo(0, 0); }, []);

  /* Get authenticated user — runs only once */
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const getUser = async () => {
      if (!config.supabaseClient) { navigate('/login'); return; }
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) { navigate('/login'); return; }

      setUserId(user.id);
      setUserEmail(user.email || undefined);

      try {
        const { error: fetchError } = await config.supabaseClient
          .from('user_financial_data').select('status').eq('user_id', user.id).maybeSingle();
        if (fetchError) console.warn('[FinancialLink] Supabase query error (ignoring):', fetchError.message);
      } catch (err) {
        console.warn('[FinancialLink] Error checking financial data (ignoring):', err);
      }

      setIsReady(true);
    };

    getUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ─── Plaid hook — the real integration ─── */
  const plaid = usePlaidLinkHook(userId, userEmail);

  /* ─── Extract all accounts from balance data ─── */
  const allAccounts = useMemo(() => {
    return plaid.financialData?.balance?.data?.accounts || [];
  }, [plaid.financialData]);

  /* ─── Group accounts by type ─── */
  const accountGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const acc of allAccounts) {
      const key = acc.type || 'other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(acc);
    }
    return groups;
  }, [allAccounts]);

  /* ─── Total balance ─── */
  const totalBalance = useMemo(() => {
    return allAccounts.reduce((sum: number, acc: any) => {
      const bal = acc.balances?.current ?? acc.balances?.available ?? 0;
      return sum + bal;
    }, 0);
  }, [allAccounts]);

  /* ─── Identity data ─── */
  const identityInfo = useMemo(() => {
    const id = plaid.financialData?.identity?.data;
    if (!id) return null;
    const accounts = id.accounts || [];
    if (accounts.length === 0) return null;
    const owners = accounts[0]?.owners || [];
    if (owners.length === 0) return null;
    const owner = owners[0];
    const rawEmails = (owner.emails || []).map((e: any) => e.data).filter(Boolean);
    const uniqueEmails = [...new Set(rawEmails.map((e: string) => e.toLowerCase()))];
    const rawPhones = (owner.phone_numbers || []).map((p: any) => p.data).filter(Boolean);
    const uniquePhones = [...new Set(rawPhones)];
    return {
      names: owner.names || [],
      emails: uniqueEmails,
      phones: uniquePhones,
      addresses: (owner.addresses || []).map((a: any) => {
        const d = a.data || {};
        return [d.street, d.city, d.region, d.postal_code, d.country].filter(Boolean).join(', ');
      }),
    };
  }, [plaid.financialData]);

  /* ─── Investment holdings ─── */
  const investmentHoldings = useMemo(() => {
    return plaid.financialData?.investments?.data?.holdings || [];
  }, [plaid.financialData]);

  /* ─── UI state derived from Plaid ─── */
  const isProcessing = ['creating_token', 'exchanging', 'fetching'].includes(plaid.step);
  const isInitializing = plaid.step === 'idle' || plaid.step === 'creating_token';
  const isDone = plaid.step === 'done';
  const canProceed = isDone && plaid.canProceed;

  const buttonText = useMemo(() => {
    if (plaid.step === 'idle' || plaid.step === 'creating_token') return 'preparing...';
    if (plaid.step === 'linking') return 'connecting...';
    if (plaid.step === 'exchanging') return 'securing connection...';
    if (plaid.step === 'fetching') return 'fetching financial data...';
    if (isDone && canProceed) return 'continue to kyc';
    if (plaid.step === 'error' || (isDone && !plaid.canProceed)) return 'try again';
    return 'connect bank account';
  }, [plaid.step, plaid.canProceed, isDone, canProceed]);

  const isButtonDisabled = isInitializing || isProcessing;

  /* ─── Verification row statuses ─── */
  const verificationRows = useMemo(() => {
    const balanceStatus = plaid.balanceStatus;
    const assetsStatus = plaid.assetsStatus;
    const investmentsStatus = plaid.investmentsStatus;
    const hasIdentity = !!identityInfo;

    return [
      {
        icon: 'account_balance_wallet',
        title: 'assets',
        subtitle: balanceStatus === 'success'
          ? `${allAccounts.length} accounts · ${formatCurrency(totalBalance)}`
          : balanceStatus === 'loading' ? 'fetching...' : 'not available',
        status: balanceStatus,
      },
      {
        icon: 'monitoring',
        title: 'investments',
        subtitle: investmentsStatus === 'success' && investmentHoldings.length > 0
          ? `${investmentHoldings.length} holdings`
          : investmentsStatus === 'loading' ? 'fetching...' : 'no investment accounts',
        status: investmentsStatus,
      },
      {
        icon: 'badge',
        title: 'identity',
        subtitle: hasIdentity
          ? `✓ verified — ${identityInfo!.names[0] || ''}`
          : plaid.step === 'done' ? 'not available' : 'not available',
        status: hasIdentity ? 'success' as const : 'idle' as const,
      },
    ];
  }, [plaid, allAccounts, totalBalance, identityInfo, investmentHoldings]);

  /* ─── Main button handler — Plaid flow ─── */
  const handleButtonClick = useCallback(() => {
    if (isDone && canProceed) {
      const result: FinancialVerificationResult = {
        verified: true,
        productsAvailable: plaid.productsAvailable,
        institutionName: plaid.institution?.name,
        institutionId: plaid.institution?.id,
        balanceAvailable: plaid.balanceStatus === 'success',
        assetsAvailable: plaid.assetsStatus === 'success',
        investmentsAvailable: plaid.investmentsStatus === 'success',
        timestamp: new Date().toISOString(),
      };
      sessionStorage.setItem('financial_verification_complete', 'true');
      navigate('/onboarding/step-1', { replace: true });
      return;
    }
    if (plaid.step === 'error' || (isDone && !plaid.canProceed)) {
      plaid.retry();
      return;
    }
    if (plaid.isReady) {
      plaid.openPlaidLink();
    }
  }, [isDone, canProceed, plaid, navigate]);

  /* Skip — let user proceed without linking bank */
  const handleSkip = useCallback(() => {
    sessionStorage.setItem('financial_link_skipped', 'true');
    console.log('[FinancialLink] User skipped financial verification');
    navigate('/onboarding/step-1', { replace: true });
  }, [navigate]);

  return {
    userId,
    userEmail,
    isReady,
    /* Plaid state */
    plaidStep: plaid.step,
    institution: plaid.institution,
    isDone,
    canProceed,
    isProcessing,
    isButtonDisabled,
    buttonText,
    error: plaid.error,
    /* Data */
    verificationRows,
    allAccounts,
    accountGroups,
    totalBalance,
    identityInfo,
    investmentHoldings,
    /* Actions */
    handleButtonClick,
    handleSkip,
    openPlaidLink: plaid.openPlaidLink,
    retry: plaid.retry,
  };
};
