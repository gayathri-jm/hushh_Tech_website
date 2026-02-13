/**
 * KycFinancialLinkScreen — Pre-KYC Financial Verification
 * 
 * Screen shown BEFORE the KYC Intro. Links user's bank via Plaid
 * and fetches 3 financial data points:
 * 1. Balance
 * 2. Assets
 * 3. Investments
 * 
 * Handles all 8 permutations (each can be ✅/❌) gracefully.
 * User can proceed if at least 1 product is successfully fetched.
 */
'use client';

import React, { useMemo } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Flex,
  Spinner,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { usePlaidLinkHook } from '../../../services/plaid/usePlaidLink';
import { formatCurrency, getHeaderTitle, type ProductFetchStatus } from '../../../services/plaid/plaidService';
import type { FinancialVerificationResult } from '../../../types/kyc';

// =====================================================
// Props
// =====================================================

export interface KycFinancialLinkScreenProps {
  /** User ID for Plaid Link */
  userId: string;
  /** User email (optional, improves Plaid Link UX) */
  userEmail?: string;
  /** Called with financial verification result when user clicks "Continue to KYC" */
  onContinue: (result: FinancialVerificationResult) => void;
  /** Bank name to display */
  bankName?: string;
}

// =====================================================
// Animations
// =====================================================

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); }
  50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.3); }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

// =====================================================
// Sub-Components
// =====================================================

/** Card status config — maps ProductFetchStatus to visual props */
const getCardConfig = (status: ProductFetchStatus) => {
  switch (status) {
    case 'loading':
      return {
        borderColor: 'whiteAlpha.200',
        bg: 'rgba(30,30,40,0.6)',
        icon: null,
        showSpinner: true,
        textColor: 'whiteAlpha.700',
      };
    case 'success':
      return {
        borderColor: 'green.500',
        bg: 'rgba(34, 197, 94, 0.08)',
        icon: '✅',
        showSpinner: false,
        textColor: 'green.300',
      };
    case 'pending':
      return {
        borderColor: 'yellow.500',
        bg: 'rgba(234, 179, 8, 0.08)',
        icon: '⏳',
        showSpinner: true,
        textColor: 'yellow.300',
      };
    case 'unavailable':
      return {
        borderColor: 'whiteAlpha.100',
        bg: 'rgba(30,30,40,0.3)',
        icon: '—',
        showSpinner: false,
        textColor: 'whiteAlpha.400',
      };
    case 'error':
      return {
        borderColor: 'red.500',
        bg: 'rgba(239, 68, 68, 0.08)',
        icon: '❌',
        showSpinner: false,
        textColor: 'red.300',
      };
    default: // idle
      return {
        borderColor: 'whiteAlpha.100',
        bg: 'rgba(30,30,40,0.4)',
        icon: '○',
        showSpinner: false,
        textColor: 'whiteAlpha.400',
      };
  }
};

/** Financial Product Status Card */
const ProductCard: React.FC<{
  title: string;
  emoji: string;
  status: ProductFetchStatus;
  mainValue?: string;
  subtitle?: string;
  unavailableMessage?: string;
  errorMessage?: string;
  index: number;
}> = ({ title, emoji, status, mainValue, subtitle, unavailableMessage, errorMessage, index }) => {
  const config = getCardConfig(status);

  return (
    <Box
      w="100%"
      borderRadius="16px"
      border="1px solid"
      borderColor={config.borderColor}
      bg={config.bg}
      p={4}
      backdropFilter="blur(10px)"
      transition="all 0.4s ease"
      animation={status !== 'idle' ? `${fadeInUp} 0.5s ease ${index * 0.15}s both` : undefined}
    >
      <Flex align="center" gap={3}>
        {/* Icon / Spinner */}
        <Box
          w="40px"
          h="40px"
          borderRadius="12px"
          bg="whiteAlpha.100"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          fontSize="lg"
        >
          {config.showSpinner ? (
            <Spinner size="sm" color={config.textColor} speed="0.8s" />
          ) : (
            <Text fontSize="lg">{config.icon || emoji}</Text>
          )}
        </Box>

        {/* Content */}
        <Box flex="1">
          <Flex align="center" gap={2}>
            <Text fontSize="sm" fontWeight="600" color="white">
              {emoji} {title}
            </Text>
          </Flex>

          {/* Status-specific content */}
          {status === 'loading' && (
            <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
              Fetching...
            </Text>
          )}

          {status === 'success' && (
            <>
              <Text fontSize="md" fontWeight="700" color={config.textColor} mt={1}>
                {mainValue || 'Data found'}
              </Text>
              {subtitle && (
                <Text fontSize="xs" color="whiteAlpha.500" mt={0.5}>
                  {subtitle}
                </Text>
              )}
            </>
          )}

          {status === 'pending' && (
            <Text fontSize="xs" color={config.textColor} mt={1}>
              Generating report... This may take a moment
            </Text>
          )}

          {status === 'unavailable' && (
            <Text fontSize="xs" color={config.textColor} mt={1}>
              {unavailableMessage || 'Not available for this account type'}
            </Text>
          )}

          {status === 'error' && (
            <Text fontSize="xs" color={config.textColor} mt={1}>
              {errorMessage || 'Failed to fetch'}
            </Text>
          )}

          {status === 'idle' && (
            <Text fontSize="xs" color={config.textColor} mt={1}>
              Waiting to connect...
            </Text>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

// =====================================================
// Main Component
// =====================================================

const KycFinancialLinkScreen: React.FC<KycFinancialLinkScreenProps> = ({
  userId,
  userEmail,
  onContinue,
  bankName = 'Your Bank',
}) => {
  const plaid = usePlaidLinkHook(userId, userEmail);

  // Determine what to show on each card
  const balanceDisplay = useMemo(() => {
    const data = plaid.financialData?.balance?.data;
    if (!data) return { mainValue: undefined, subtitle: undefined };
    return {
      mainValue: formatCurrency(data.total_balance, data.currency),
      subtitle: `${data.account_count} account${data.account_count !== 1 ? 's' : ''} linked`,
    };
  }, [plaid.financialData]);

  const assetsDisplay = useMemo(() => {
    const data = plaid.financialData?.assets?.data;
    if (!data) return { mainValue: undefined, subtitle: undefined };
    if (data.status === 'pending') return { mainValue: undefined, subtitle: undefined };
    const totalAccounts = data.items?.reduce(
      (sum: number, item: any) => sum + (item.accounts?.length || 0), 0
    ) || 0;
    return {
      mainValue: 'Report generated',
      subtitle: `${data.days_requested} days history • ${totalAccounts} account${totalAccounts !== 1 ? 's' : ''}`,
    };
  }, [plaid.financialData]);

  const investmentsDisplay = useMemo(() => {
    const data = plaid.financialData?.investments?.data;
    if (!data) return { mainValue: undefined, subtitle: undefined };
    return {
      mainValue: formatCurrency(data.total_value, data.currency),
      subtitle: `${data.holdings_count} holding${data.holdings_count !== 1 ? 's' : ''} found`,
    };
  }, [plaid.financialData]);

  // Header title based on available products
  const headerTitle = useMemo(() => {
    if (plaid.step === 'done') return getHeaderTitle(plaid.productsAvailable);
    return '💰 Financial Verification';
  }, [plaid.step, plaid.productsAvailable]);

  // Is in a loading/processing state?
  const isProcessing = ['creating_token', 'exchanging', 'fetching'].includes(plaid.step);

  // Info message based on results
  const infoMessage = useMemo(() => {
    if (plaid.step !== 'done') return null;

    const { productsAvailable } = plaid;
    if (productsAvailable === 3) return null; // No extra message needed
    if (productsAvailable > 0) {
      return "We've saved what's available. You can link additional accounts later if needed.";
    }
    return 'Something went wrong. Please try again or link a different account.';
  }, [plaid.step, plaid.productsAvailable]);

  // Button text
  const buttonText = useMemo(() => {
    if (plaid.step === 'creating_token') return 'Preparing...';
    if (plaid.step === 'linking') return 'Connecting...';
    if (plaid.step === 'exchanging') return 'Securing connection...';
    if (plaid.step === 'fetching') return 'Fetching financial data...';
    if (plaid.step === 'done' && plaid.canProceed) {
      if (plaid.productsAvailable === 3) return 'Continue with full profile →';
      return 'Continue to KYC →';
    }
    if (plaid.step === 'error' || (plaid.step === 'done' && !plaid.canProceed)) {
      return '🔄 Retry';
    }
    return 'Link Bank Account';
  }, [plaid.step, plaid.canProceed, plaid.productsAvailable]);

  // Handle button click
  const handleButtonClick = () => {
    if (plaid.step === 'done' && plaid.canProceed) {
      // Build the financial verification result for the gate
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
      onContinue(result);
      return;
    }
    if (plaid.step === 'error' || (plaid.step === 'done' && !plaid.canProceed)) {
      plaid.retry();
      return;
    }
    if (plaid.isReady) {
      plaid.openPlaidLink();
    }
  };

  return (
    <Box
      minH="100vh"
      bg="linear-gradient(180deg, #0A0A0F 0%, #12121A 100%)"
      px={4}
      py={8}
      display="flex"
      flexDirection="column"
    >
      {/* Main Content */}
      <VStack
        flex="1"
        spacing={6}
        justify="center"
        align="center"
        maxW="420px"
        mx="auto"
        w="100%"
      >
        {/* Hero Icon */}
        <Box
          p={4}
          borderRadius="24px"
          bg="linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(34, 197, 94, 0.15) 100%)"
          border="1px solid"
          borderColor="whiteAlpha.100"
          animation={`${pulseGlow} 3s ease-in-out infinite`}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M2 7a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"
              stroke="url(#bank-gradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="rgba(99, 102, 241, 0.1)"
            />
            <path d="M2 10h20" stroke="url(#bank-gradient)" strokeWidth="1.5" />
            <path d="M6 14h4" stroke="url(#bank-gradient)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6 17h2" stroke="url(#bank-gradient)" strokeWidth="1.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="bank-gradient" x1="2" y1="5" x2="22" y2="19" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366F1" />
                <stop offset="1" stopColor="#22C55E" />
              </linearGradient>
            </defs>
          </svg>
        </Box>

        {/* Title & Subtitle */}
        <VStack spacing={3} textAlign="center">
          <Heading
            as="h1"
            size="xl"
            bgGradient="linear(to-r, white, gray.300)"
            bgClip="text"
            fontWeight="600"
            lineHeight="1.2"
          >
            {headerTitle}
          </Heading>
          <Text
            fontSize="md"
            color="whiteAlpha.700"
            lineHeight="1.6"
            px={2}
          >
            {plaid.step === 'done'
              ? plaid.institution
                ? `Connected to ${plaid.institution.name}`
                : 'Financial data retrieved'
              : "We'll securely check your financial profile before starting KYC verification."}
          </Text>
        </VStack>

        {/* 3 Product Cards */}
        <VStack spacing={3} w="100%">
          <ProductCard
            title="Balance"
            emoji="💰"
            status={plaid.balanceStatus}
            mainValue={balanceDisplay.mainValue}
            subtitle={balanceDisplay.subtitle}
            unavailableMessage="Balance data not available for this institution"
            errorMessage={plaid.financialData?.balance?.error || 'Failed to fetch balance'}
            index={0}
          />

          <ProductCard
            title="Assets"
            emoji="📊"
            status={plaid.assetsStatus}
            mainValue={assetsDisplay.mainValue}
            subtitle={assetsDisplay.subtitle}
            unavailableMessage="Asset reports not supported by this institution"
            errorMessage={plaid.financialData?.assets?.error || 'Failed to fetch assets'}
            index={1}
          />

          <ProductCard
            title="Investments"
            emoji="📈"
            status={plaid.investmentsStatus}
            mainValue={investmentsDisplay.mainValue}
            subtitle={investmentsDisplay.subtitle}
            unavailableMessage="No investment accounts found at this institution"
            errorMessage={plaid.financialData?.investments?.error || 'Failed to fetch investments'}
            index={2}
          />
        </VStack>

        {/* Info Message (shown after results) */}
        {infoMessage && (
          <Box
            w="100%"
            borderRadius="12px"
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.100"
            p={3}
            animation={`${fadeInUp} 0.5s ease 0.5s both`}
          >
            <Text fontSize="xs" color="whiteAlpha.500" textAlign="center" lineHeight="1.5">
              ℹ️ {infoMessage}
            </Text>
          </Box>
        )}

        {/* Error Message */}
        {plaid.error && plaid.step === 'error' && (
          <Box
            w="100%"
            borderRadius="12px"
            bg="rgba(239, 68, 68, 0.08)"
            border="1px solid"
            borderColor="red.500"
            p={3}
          >
            <Text fontSize="xs" color="red.300" textAlign="center" lineHeight="1.5">
              ⚠️ {plaid.error}
            </Text>
          </Box>
        )}

        {/* Security Badge */}
        <Flex
          align="center"
          gap={2}
          opacity={0.6}
          fontSize="xs"
          color="whiteAlpha.600"
        >
          <Box w="6px" h="6px" borderRadius="full" bg="green.400" />
          <Text>Secured with 256-bit encryption • Powered by Plaid</Text>
        </Flex>
      </VStack>

      {/* Bottom CTA */}
      <Box
        pt={6}
        pb={4}
        maxW="420px"
        mx="auto"
        w="100%"
      >
        <Button
          w="100%"
          size="lg"
          bg={
            plaid.step === 'done' && plaid.canProceed
              ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
              : plaid.step === 'error' || (plaid.step === 'done' && !plaid.canProceed)
                ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)'
          }
          color="white"
          borderRadius="14px"
          h="56px"
          fontSize="md"
          fontWeight="500"
          isDisabled={isProcessing || plaid.step === 'creating_token'}
          isLoading={isProcessing}
          loadingText={buttonText}
          _hover={{
            opacity: 0.9,
            transform: 'translateY(-1px)',
          }}
          _active={{
            transform: 'translateY(0)',
          }}
          transition="all 0.2s"
          onClick={handleButtonClick}
          aria-label={buttonText}
        >
          {buttonText}
        </Button>

        {/* Link Different Account (shown after failure or done) */}
        {(plaid.step === 'done' || plaid.step === 'error') && (
          <Button
            w="100%"
            mt={3}
            size="md"
            variant="ghost"
            color="whiteAlpha.500"
            fontWeight="400"
            fontSize="sm"
            onClick={plaid.retry}
            _hover={{ color: 'whiteAlpha.800' }}
          >
            {plaid.step === 'done' && plaid.canProceed
              ? 'Link a different account'
              : 'Try a different account'}
          </Button>
        )}

        {/* Bank Info */}
        <Text
          textAlign="center"
          fontSize="xs"
          color="whiteAlpha.400"
          mt={3}
        >
          {bankName} × Hushh Financial Verification
        </Text>
      </Box>
    </Box>
  );
};

export default KycFinancialLinkScreen;
