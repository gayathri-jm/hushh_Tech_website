/**
 * KycFinancialLinkScreen — Pre-KYC Financial Verification
 * 
 * iOS-first design. White background, black text, grey icons.
 * Bright primary color accents (blue/teal) matching sign-nda style.
 * 
 * Links user's bank via Plaid and fetches 3 data points:
 * 1. Balance  2. Assets  3. Investments
 * 
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
  Badge,
  HStack,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { usePlaidLinkHook } from '../../../services/plaid/usePlaidLink';
import {
  formatCurrency,
  getHeaderTitle,
  type ProductFetchStatus,
} from '../../../services/plaid/plaidService';
import type { FinancialVerificationResult } from '../../../types/kyc';

// =====================================================
// Design Tokens — Apple-inspired
// =====================================================

const COLORS = {
  primary: '#0066FF',
  primaryHover: '#0052CC',
  primaryLight: '#E6F0FF',
  primaryGradient: 'linear-gradient(135deg, #0066FF 0%, #00C9A7 100%)',
  accent: '#00C9A7',
  accentLight: '#E6FFF9',
  bg: '#FFFFFF',
  bgSubtle: '#FAFAFA',
  textPrimary: '#111111',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  cardBg: '#FFFFFF',
  cardBgHover: '#F9FAFB',
  success: '#22C55E',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',
  error: '#EF4444',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  pending: '#F59E0B',
  pendingBg: '#FFFBEB',
  iconBg: '#F3F4F6',
  green: '#22C55E',
};

// =====================================================
// Props
// =====================================================

export interface KycFinancialLinkScreenProps {
  /** User ID for Plaid Link */
  userId: string;
  /** User email (optional, improves Plaid Link UX) */
  userEmail?: string;
  /** Called with financial verification result */
  onContinue: (result: FinancialVerificationResult) => void;
  /** Called when user skips financial verification */
  onSkip?: () => void;
  /** Bank name to display */
  bankName?: string;
}

// =====================================================
// Animations — subtle, Apple-like
// =====================================================

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// =====================================================
// Icons — clean gray SVGs (Apple-style)
// =====================================================

/** Wallet icon for Balance */
const BalanceIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="6" width="20" height="14" rx="3" stroke="#8E8E93" strokeWidth="1.5" />
    <path d="M2 10h20" stroke="#8E8E93" strokeWidth="1.5" />
    <circle cx="17" cy="15" r="1.5" fill="#8E8E93" />
  </svg>
);

/** Chart icon for Assets */
const AssetsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="#8E8E93" strokeWidth="1.5" />
    <path d="M7 17V13" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 17V9" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M17 17V11" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** Trending icon for Investments */
const InvestmentsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 17l5-5 4 4 9-9" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 7h4v4" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);


// =====================================================
// Status check icon
// =====================================================

const StatusIndicator: React.FC<{ status: ProductFetchStatus }> = ({ status }) => {
  if (status === 'loading') {
    return <Spinner size="xs" color={COLORS.textSecondary} speed="0.8s" />;
  }

  if (status === 'success') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill={COLORS.success} />
        <path d="M6 10l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (status === 'pending') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke={COLORS.pending} strokeWidth="1.5" />
        <path d="M10 6v4l2.5 2.5" stroke={COLORS.pending} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (status === 'error') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill={COLORS.error} />
        <path d="M7 7l6 6M13 7l-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (status === 'unavailable') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke={COLORS.textTertiary} strokeWidth="1.5" />
        <path d="M7 10h6" stroke={COLORS.textTertiary} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // idle — no icon shown (avoids radio-button confusion)
  return null;
};

// =====================================================
// Product Card — clean, minimal
// =====================================================

const ProductCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  status: ProductFetchStatus;
  mainValue?: string;
  subtitle?: string;
  unavailableMessage?: string;
  errorMessage?: string;
  index: number;
}> = ({ title, icon, status, mainValue, subtitle, unavailableMessage, errorMessage, index }) => {
  // Status text
  const statusText = useMemo(() => {
    switch (status) {
      case 'loading': return 'Fetching...';
      case 'success': return mainValue || 'Verified';
      case 'pending': return 'Generating report...';
      case 'unavailable': return unavailableMessage || 'Not available';
      case 'error': return errorMessage || 'Failed to fetch';
      default: return 'Auto-fetched on connect';
    }
  }, [status, mainValue, unavailableMessage, errorMessage]);

  // Status text color
  const statusColor = useMemo(() => {
    switch (status) {
      case 'success': return COLORS.success;
      case 'error': return COLORS.error;
      case 'pending': return COLORS.pending;
      case 'loading': return COLORS.textSecondary;
      default: return COLORS.textTertiary;
    }
  }, [status]);

  // Left accent color per status
  const accentColor = useMemo(() => {
    switch (status) {
      case 'success': return COLORS.success;
      case 'error': return COLORS.error;
      case 'pending': return COLORS.pending;
      case 'loading': return COLORS.primary;
      default: return COLORS.border;
    }
  }, [status]);

  return (
    <Flex
      w="100%"
      bg={COLORS.cardBg}
      borderRadius="16px"
      border="1px solid"
      borderColor={status === 'success' ? COLORS.successBorder : COLORS.border}
      p={4}
      align="center"
      gap={3}
      transition="all 0.3s ease"
      animation={status !== 'idle' ? `${fadeIn} 0.4s ease ${index * 0.1}s both` : undefined}
      _hover={{ bg: COLORS.cardBgHover, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      boxShadow="0 1px 3px rgba(0,0,0,0.02)"
      position="relative"
      overflow="hidden"
    >
      {/* Left accent bar */}
      <Box
        position="absolute"
        left={0}
        top="20%"
        bottom="20%"
        w="3px"
        borderRadius="0 4px 4px 0"
        bg={accentColor}
        transition="all 0.3s ease"
      />

      {/* Icon container */}
      <Box
        w="44px"
        h="44px"
        borderRadius="12px"
        bg={status === 'success' ? COLORS.successBg : COLORS.iconBg}
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        ml={1}
        transition="background 0.3s ease"
      >
        {icon}
      </Box>

      {/* Text content */}
      <Box flex="1" minW={0}>
        <Text
          fontSize="15px"
          fontWeight="600"
          color={COLORS.textPrimary}
          lineHeight="1.3"
        >
          {title}
        </Text>
        <Text
          fontSize="13px"
          fontWeight="400"
          color={statusColor}
          mt="2px"
          lineHeight="1.4"
          noOfLines={1}
        >
          {statusText}
        </Text>
        {status === 'success' && subtitle && (
          <Text
            fontSize="12px"
            color={COLORS.textTertiary}
            mt="1px"
            noOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </Box>

      {/* Right status indicator */}
      <Box flexShrink={0}>
        <StatusIndicator status={status} />
      </Box>
    </Flex>
  );
};

// =====================================================
// Main Component
// =====================================================

const KycFinancialLinkScreen: React.FC<KycFinancialLinkScreenProps> = ({
  userId,
  userEmail,
  onContinue,
  onSkip,
  bankName = 'Hushh',
}) => {
  const plaid = usePlaidLinkHook(userId, userEmail);

  // Display values for each product
  const balanceDisplay = useMemo(() => {
    const data = plaid.financialData?.balance?.data;
    if (!data) return { mainValue: undefined, subtitle: undefined };

    // Raw Plaid response has `accounts[]` array — compute totals from it
    const accounts = data.accounts || [];
    const accountCount = accounts.length;
    const totalBalance = accounts.reduce(
      (sum: number, acc: any) => sum + (acc.balances?.current || 0), 0
    );
    const currency = accounts[0]?.balances?.iso_currency_code || 'USD';

    return {
      mainValue: formatCurrency(totalBalance, currency),
      subtitle: `${accountCount} account${accountCount !== 1 ? 's' : ''} linked`,
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
      subtitle: `${data.days_requested} days · ${totalAccounts} account${totalAccounts !== 1 ? 's' : ''}`,
    };
  }, [plaid.financialData]);

  const investmentsDisplay = useMemo(() => {
    const data = plaid.financialData?.investments?.data;
    if (!data) return { mainValue: undefined, subtitle: undefined };

    // Raw Plaid response has `holdings[]` and `securities[]` arrays
    const holdings = data.holdings || [];
    const holdingsCount = holdings.length;
    const totalValue = holdings.reduce(
      (sum: number, h: any) => sum + (h.institution_value || 0), 0
    );
    const currency = holdings[0]?.iso_currency_code || 'USD';

    return {
      mainValue: formatCurrency(totalValue, currency),
      subtitle: `${holdingsCount} holding${holdingsCount !== 1 ? 's' : ''} found`,
    };
  }, [plaid.financialData]);

  // Header text
  const headerTitle = useMemo(() => {
    if (plaid.step === 'done') {
      if (plaid.productsAvailable === 3) return 'Complete Profile';
      if (plaid.productsAvailable > 0) return 'Profile Verified';
      return 'Unable to Verify';
    }
    return 'Financial Verification';
  }, [plaid.step, plaid.productsAvailable]);

  const headerSubtitle = useMemo(() => {
    if (plaid.step === 'done' && plaid.institution) {
      return `Connected to ${plaid.institution.name}`;
    }
    return "We'll securely check your financial profile before starting KYC verification.";
  }, [plaid.step, plaid.institution]);

  const isProcessing = ['creating_token', 'exchanging', 'fetching'].includes(plaid.step);
  const isInitializing = plaid.step === 'idle' || plaid.step === 'creating_token';

  // Info message after results
  const infoMessage = useMemo(() => {
    if (plaid.step !== 'done') return null;
    if (plaid.productsAvailable === 3) return null;
    if (plaid.productsAvailable > 0) {
      return "We've saved what's available. You can link additional accounts later.";
    }
    return 'Something went wrong. Please try again or link a different account.';
  }, [plaid.step, plaid.productsAvailable]);

  // Button text
  const buttonText = useMemo(() => {
    if (plaid.step === 'idle') return 'Preparing...';
    if (plaid.step === 'creating_token') return 'Preparing...';
    if (plaid.step === 'linking') return 'Connecting...';
    if (plaid.step === 'exchanging') return 'Securing connection...';
    if (plaid.step === 'fetching') return 'Fetching financial data...';
    if (plaid.step === 'done' && plaid.canProceed) return 'Continue to KYC';
    if (plaid.step === 'error' || (plaid.step === 'done' && !plaid.canProceed)) return 'Try Again';
    return 'Link Bank Account';
  }, [plaid.step, plaid.canProceed]);

  // Handle button click
  const handleButtonClick = () => {
    if (plaid.step === 'done' && plaid.canProceed) {
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

  // Button bg color based on state — matches KYC flow gradient
  const buttonBg = useMemo(() => {
    if (plaid.step === 'done' && plaid.canProceed) return COLORS.success;
    if (plaid.step === 'error' || (plaid.step === 'done' && !plaid.canProceed)) return COLORS.error;
    return COLORS.primaryGradient;
  }, [plaid.step, plaid.canProceed]);

  const buttonHoverBg = useMemo(() => {
    if (plaid.step === 'done' && plaid.canProceed) return '#2DB84E';
    if (plaid.step === 'error' || (plaid.step === 'done' && !plaid.canProceed)) return '#E5342B';
    return COLORS.primaryGradient;
  }, [plaid.step, plaid.canProceed]);

  return (
    <Box
      minH="100vh"
      bg={COLORS.bg}
      display="flex"
      flexDirection="column"
      position="relative"
    >
      {/* Scrollable Content */}
      <Box
        flex="1"
        overflowY="auto"
        px={5}
        pt={10}
        pb="200px"
      >
        <VStack
          spacing={0}
          align="center"
          maxW="390px"
          mx="auto"
          w="100%"
        >
        {/* Gradient Icon Badge */}
        <Flex
          w="64px"
          h="64px"
          borderRadius="18px"
          bg={COLORS.primaryGradient}
          align="center"
          justify="center"
          mb={4}
          boxShadow={`0 6px 20px ${COLORS.primary}30`}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 5H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 10h18" stroke="white" strokeWidth="1.8" />
            <circle cx="16" cy="14.5" r="1.5" fill="white" />
          </svg>
        </Flex>

        {/* Step badge */}
        <Badge
          bg={COLORS.primaryLight}
          color={COLORS.primary}
          px={3}
          py={1}
          borderRadius="full"
          fontSize="10px"
          fontWeight="700"
          textTransform="uppercase"
          letterSpacing="0.06em"
          mb={3}
        >
          Pre-KYC Step
        </Badge>

        {/* Title */}
        <Heading
          as="h1"
          fontSize="28px"
          fontWeight="700"
          color={COLORS.textPrimary}
          textAlign="center"
          letterSpacing="-0.5px"
          lineHeight="1.15"
          mb={2}
        >
          {headerTitle}
        </Heading>

        {/* Subtitle */}
        <Text
          fontSize="15px"
          color={COLORS.textSecondary}
          textAlign="center"
          lineHeight="1.5"
          px={2}
          mb={4}
        >
          {headerSubtitle}
        </Text>

        {/* Security badge — prominent pill */}
        <Flex
          align="center"
          gap={2}
          mb={6}
          px={4}
          py={2.5}
          borderRadius="full"
          bg={COLORS.accentLight}
          border="1px solid"
          borderColor={`${COLORS.accent}30`}
        >
          <Box w="7px" h="7px" borderRadius="full" bg={COLORS.green} />
          <Text fontSize="12px" color={COLORS.textSecondary} fontWeight="600">
            256-bit encryption · Powered by Plaid
          </Text>
        </Flex>

        {/* Gradient divider */}
        <Box w="100%" h="2px" bg={`linear-gradient(90deg, transparent, ${COLORS.primary}40, ${COLORS.accent}40, transparent)`} borderRadius="full" mb={6} />

        {/* Product Cards */}
        <VStack spacing={3} w="100%" mb={6}>
          <ProductCard
            title="Balance"
            icon={<BalanceIcon />}
            status={plaid.balanceStatus}
            mainValue={balanceDisplay.mainValue}
            subtitle={balanceDisplay.subtitle}
            unavailableMessage="Not available for this institution"
            errorMessage={plaid.financialData?.balance?.error || 'Failed to fetch'}
            index={0}
          />

          <ProductCard
            title="Assets"
            icon={<AssetsIcon />}
            status={plaid.assetsStatus}
            mainValue={assetsDisplay.mainValue}
            subtitle={assetsDisplay.subtitle}
            unavailableMessage="Not supported by this institution"
            errorMessage={plaid.financialData?.assets?.error || 'Failed to fetch'}
            index={1}
          />

          <ProductCard
            title="Investments"
            icon={<InvestmentsIcon />}
            status={plaid.investmentsStatus}
            mainValue={investmentsDisplay.mainValue}
            subtitle={investmentsDisplay.subtitle}
            unavailableMessage="No investment accounts found"
            errorMessage={plaid.financialData?.investments?.error || 'Failed to fetch'}
            index={2}
          />
        </VStack>

        {/* Info Message */}
        {infoMessage && (
          <Box
            w="100%"
            borderRadius="12px"
            bg={COLORS.borderLight}
            p={4}
            mb={4}
            animation={`${fadeIn} 0.4s ease 0.3s both`}
          >
            <Text
              fontSize="13px"
              color={COLORS.textSecondary}
              textAlign="center"
              lineHeight="1.5"
            >
              {infoMessage}
            </Text>
          </Box>
        )}

        {/* Error Message */}
        {plaid.error && plaid.step === 'error' && (
          <Box
            w="100%"
            borderRadius="12px"
            bg={COLORS.errorBg}
            border="1px solid"
            borderColor="#FFD5D2"
            p={4}
            mb={4}
          >
            <Text
              fontSize="13px"
              color={COLORS.error}
              textAlign="center"
              lineHeight="1.5"
            >
              {plaid.error}
            </Text>
          </Box>
        )}

        </VStack>
      </Box>

      {/* Sticky Bottom CTA — fixed, centered, connected to footer */}
      <Box
        position="fixed"
        bottom={0}
        left="50%"
        transform="translateX(-50%)"
        w="100%"
        maxW="500px"
        bg="rgba(255,255,255,0.95)"
        backdropFilter="blur(20px)"
        sx={{ WebkitBackdropFilter: 'blur(20px)' }}
        borderTop="1px solid"
        borderColor={COLORS.border}
        px={5}
        pt={4}
        pb="env(safe-area-inset-bottom, 24px)"
        zIndex={10}
        boxShadow="0 -4px 20px rgba(0,0,0,0.03)"
        data-onboarding-footer=""
      >
        <Box w="100%">
        {/* "Continue to KYC" — gradient CTA */}
        {plaid.step === 'done' && plaid.canProceed && (
          <Button
            w="100%"
            size="lg"
            bg={COLORS.primaryGradient}
            color="white"
            borderRadius="14px"
            h="54px"
            fontSize="16px"
            fontWeight="600"
            _hover={{
              transform: 'translateY(-1px)',
              boxShadow: `0 6px 20px ${COLORS.primary}35`,
            }}
            _active={{ transform: 'translateY(0)' }}
            transition="all 0.2s ease"
            onClick={handleButtonClick}
            aria-label="Continue to KYC Step 1"
            tabIndex={0}
            animation={`${fadeIn} 0.4s ease both`}
            boxShadow={`0 3px 12px ${COLORS.primary}25`}
          >
            Continue to KYC →
          </Button>
        )}

        {/* Link / Retry / Loading button */}
        {!(plaid.step === 'done' && plaid.canProceed) && (
          <Button
            w="100%"
            size="lg"
            bg={buttonBg}
            color="white"
            borderRadius="14px"
            h="54px"
            fontSize="16px"
            fontWeight="600"
            isDisabled={isInitializing || isProcessing}
            isLoading={isInitializing || isProcessing}
            loadingText={buttonText}
            _hover={{
              transform: 'translateY(-1px)',
              boxShadow: `0 6px 20px ${COLORS.primary}30`,
            }}
            _active={{ transform: 'translateY(0)' }}
            _disabled={{
              bg: COLORS.border,
              color: COLORS.textTertiary,
              cursor: 'not-allowed',
              boxShadow: 'none',
            }}
            transition="all 0.2s ease"
            onClick={handleButtonClick}
            aria-label={buttonText}
            tabIndex={0}
          >
            {buttonText}
          </Button>
        )}

        {/* Secondary action — link different account */}
        {(plaid.step === 'done' || plaid.step === 'error') && (
          <Button
            w="100%"
            mt={2}
            size="md"
            variant="ghost"
            color={COLORS.textSecondary}
            fontWeight="400"
            fontSize="14px"
            onClick={plaid.retry}
            borderRadius="14px"
            _hover={{
              color: COLORS.textPrimary,
              bg: COLORS.borderLight,
            }}
            tabIndex={0}
            aria-label={
              plaid.step === 'done' && plaid.canProceed
                ? 'Link a different account'
                : 'Try a different account'
            }
          >
            {plaid.step === 'done' && plaid.canProceed
              ? 'Link a different account'
              : 'Try a different account'}
          </Button>
        )}

        {/* Footer text */}
        <Text
          textAlign="center"
          fontSize="12px"
          color={COLORS.textTertiary}
          mt={2}
        >
          {bankName} × Hushh Financial Verification
        </Text>

        {/* Skip for now */}
        {onSkip && (
          <Button
            w="100%"
            mt={1}
            size="sm"
            variant="ghost"
            color={COLORS.textTertiary}
            fontWeight="400"
            fontSize="14px"
            onClick={onSkip}
            borderRadius="12px"
            _hover={{
              color: COLORS.textPrimary,
              bg: COLORS.borderLight,
            }}
            tabIndex={0}
            aria-label="Skip financial verification for now"
          >
            Skip for now →
          </Button>
        )}
        </Box>
      </Box>
    </Box>
  );
};

export default KycFinancialLinkScreen;
