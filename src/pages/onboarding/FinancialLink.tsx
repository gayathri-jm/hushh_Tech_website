/**
 * FinancialLink — Pre-Onboarding Financial Verification
 * 
 * Apple-inspired clean UI wrapper. White background theme.
 * First step in the onboarding flow (before Step 1).
 * 
 * Links user's bank via Plaid and fetches:
 * 1. Balance  2. Assets  3. Investments
 * 
 * On completion → navigates to /onboarding/step-1
 * Data is saved to Supabase `user_financial_data` table automatically.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import config from '../../resources/config/config';
import KycFinancialLinkScreen from '../../components/kyc/screens/KycFinancialLinkScreen';
import type { FinancialVerificationResult } from '../../types/kyc';

export default function OnboardingFinancialLink() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      if (!config.supabaseClient) {
        navigate('/login');
        return;
      }

      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || undefined);

      // Check if user already completed financial link
      const { data: financialData } = await config.supabaseClient
        .from('user_financial_data')
        .select('status')
        .eq('user_id', user.id)
        .single();

      // If already completed, skip to step 1
      if (financialData?.status === 'complete' || financialData?.status === 'partial') {
        navigate('/onboarding/step-1', { replace: true });
        return;
      }

      setIsReady(true);
    };

    getUser();
  }, [navigate]);

  // Handle financial verification complete → go to Step 1
  const handleContinue = (result: FinancialVerificationResult) => {
    console.log('[FinancialLink] Verification complete:', result);
    navigate('/onboarding/step-1');
  };

  // Skip option — let user proceed without linking bank
  const handleSkip = () => {
    navigate('/onboarding/step-1');
  };

  // Loading state — clean white screen
  if (!isReady || !userId) {
    return <Box minH="100vh" bg="#FFFFFF" />;
  }

  return (
    <KycFinancialLinkScreen
      userId={userId}
      userEmail={userEmail}
      onContinue={handleContinue}
      onSkip={handleSkip}
      bankName="Hushh"
    />
  );
}
