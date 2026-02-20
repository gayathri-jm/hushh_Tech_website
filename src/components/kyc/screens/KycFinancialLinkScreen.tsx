/**
 * KycFinancialLinkScreen - Pre-KYC Financial Verification
 *
 * Design refreshed to match onboarding UI guidelines while keeping all
 * financial-link functionality unchanged.
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
} from '@chakra-ui/react';
import { usePlaidLinkHook } from '../../../services/plaid/usePlaidLink';
import {
  formatCurrency,
  type ProductFetchStatus,
} from '../../../services/plaid/plaidService';
import type { FinancialVerificationResult } from '../../../types/kyc';

const COLORS = {
  primary: '#3A63B8',
  primaryHover: '#2e4f94',
  textMain: '#1E293B',
  textSub: '#64748B',
  textMuted: '#94A3B8',
  surface: '#FFFFFF',
  surfaceSoft: '#F8FAFC',
  border: '#E2E8F0',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  iconBlueBg: '#E3F2FD',
  iconGreenBg: '#E8F5E9',
  iconPurpleBg: '#F3E5F5',
  iconBlue: '#1E88E5',
  iconGreen: '#43A047',
  iconPurple: '#8E24AA',
};

export interface KycFinancialLinkScreenProps {
  userId: string;
  userEmail?: string;
  onContinue: (result: FinancialVerificationResult) => void;
  onSkip?: () => void;
  bankName?: string;
}

const WalletIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2.5" y="6.5" width="19" height="13" rx="3" stroke={color} strokeWidth="1.8" />
    <path d="M2.5 10.5H21.5" stroke={color} strokeWidth="1.8" />
    <circle cx="16.5" cy="14.5" r="1.5" fill={color} />
  </svg>
);

const AssetsIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke={color} strokeWidth="1.8" />
    <path d="M8 16.5V12.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 16.5V9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M16 16.5V11.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const InvestmentsIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3.5 16.5L8.5 11.5L12.5 15.5L20.5 7.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16.5 7.5H20.5V11.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="11" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M8 11V8C8 5.8 9.8 4 12 4C14.2 4 16 5.8 16 8V11" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M13 6L19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STATUS_COLORS: Record<ProductFetchStatus, string> = {
  idle: COLORS.textMuted,
  loading: COLORS.textSub,
  success: COLORS.success,
  pending: COLORS.warning,
  unavailable: COLORS.textMuted,
  error: COLORS.error,
};

const resolveStatusText = ({
  status,
  mainValue,
  unavailableMessage,
  errorMessage,
}: {
  status: ProductFetchStatus;
  mainValue?: string;
  unavailableMessage?: string;
  errorMessage?: string;
}) => {
  switch (status) {
    case 'loading':
      return 'Fetching...';
    case 'success':
      return mainValue || 'Verified';
    case 'pending':
      return 'Generating report...';
    case 'unavailable':
      return unavailableMessage || 'Not available';
    case 'error':
      return errorMessage || 'Failed to fetch';
    default:
      return 'Auto-fetched on connect';
  }
};

const ProductCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  status: ProductFetchStatus;
  mainValue?: string;
  unavailableMessage?: string;
  errorMessage?: string;
}> = ({ title, icon, iconBg, status, mainValue, unavailableMessage, errorMessage }) => {
  const statusText = useMemo(
    () =>
      resolveStatusText({
        status,
        mainValue,
        unavailableMessage,
        errorMessage,
      }),
    [status, mainValue, unavailableMessage, errorMessage],
  );

  return (
    <Flex
      w="100%"
      align="center"
      gap={4}
      p={3}
      borderRadius="16px"
      bg={COLORS.surface}
      border="1px solid"
      borderColor={COLORS.border}
      boxShadow="0 2px 10px rgba(0,0,0,0.03)"
    >
      <Flex
        w="44px"
        h="44px"
        borderRadius="12px"
        bg={iconBg}
        align="center"
        justify="center"
        flexShrink={0}
      >
        {icon}
      </Flex>

      <Box minW={0} flex={1}>
        <Text fontSize="16px" fontWeight="600" color={COLORS.textMain} lineHeight="1.3">
          {title}
        </Text>
        <Text
          mt="2px"
          fontSize="12px"
          color={STATUS_COLORS[status]}
          fontWeight={status === 'idle' ? '500' : '600'}
          noOfLines={1}
        >
          {statusText}
        </Text>
      </Box>

      {status === 'loading' && <Spinner size="sm" color={COLORS.primary} thickness="3px" />}
    </Flex>
  );
};

const KycFinancialLinkScreen: React.FC<KycFinancialLinkScreenProps> = ({
  userId,
  userEmail,
  onContinue,
  onSkip,
  bankName = 'Hushh',
}) => {
  const plaid = usePlaidLinkHook(userId, userEmail);

  const balanceDisplay = useMemo(() => {
    const data = plaid.financialData?.balance?.data;
    if (!data) return { mainValue: undefined };

    const accounts = data.accounts || [];
    const totalBalance = accounts.reduce(
      (sum: number, acc: any) => sum + (acc.balances?.current || 0),
      0,
    );
    const currency = accounts[0]?.balances?.iso_currency_code || 'USD';

    return {
      mainValue: formatCurrency(totalBalance, currency),
    };
  }, [plaid.financialData]);

  const assetsDisplay = useMemo(() => {
    const data = plaid.financialData?.assets?.data;
    if (!data) return { mainValue: undefined };
    if (data.status === 'pending') return { mainValue: undefined };

    return {
      mainValue: 'Report generated',
    };
  }, [plaid.financialData]);

  const investmentsDisplay = useMemo(() => {
    const data = plaid.financialData?.investments?.data;
    if (!data) return { mainValue: undefined };

    const holdings = data.holdings || [];
    const totalValue = holdings.reduce(
      (sum: number, holding: any) => sum + (holding.institution_value || 0),
      0,
    );
    const currency = holdings[0]?.iso_currency_code || 'USD';

    return {
      mainValue: formatCurrency(totalValue, currency),
    };
  }, [plaid.financialData]);

  const headerTitle = useMemo(() => {
    if (plaid.step === 'done') {
      if (plaid.productsAvailable === 3) return 'Financial Verification';
      if (plaid.productsAvailable > 0) return 'Financial Verification';
      return 'Financial Verification';
    }
    return 'Financial Verification';
  }, [plaid.step, plaid.productsAvailable]);

  const headerSubtitle = useMemo(() => {
    if (plaid.step === 'done' && plaid.institution) {
      return `Connected to ${plaid.institution.name}. You can continue to the next step.`;
    }
    return "We'll securely check your financial profile before starting KYC verification.";
  }, [plaid.step, plaid.institution]);

  const isProcessing = ['creating_token', 'exchanging', 'fetching'].includes(plaid.step);
  const isInitializing = plaid.step === 'idle' || plaid.step === 'creating_token';

  const infoMessage = useMemo(() => {
    if (plaid.step !== 'done') return null;
    if (plaid.productsAvailable === 3) return null;
    if (plaid.productsAvailable > 0) {
      return "We've saved what's available. You can link additional accounts later.";
    }
    return 'Something went wrong. Please try again or link a different account.';
  }, [plaid.step, plaid.productsAvailable]);

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

  const buttonBg = useMemo(() => {
    if (plaid.step === 'done' && plaid.canProceed) return COLORS.success;
    if (plaid.step === 'error' || (plaid.step === 'done' && !plaid.canProceed)) return COLORS.error;
    return COLORS.primary;
  }, [plaid.step, plaid.canProceed]);

  const buttonHoverBg = useMemo(() => {
    if (plaid.step === 'done' && plaid.canProceed) return '#15803D';
    if (plaid.step === 'error' || (plaid.step === 'done' && !plaid.canProceed)) return '#B91C1C';
    return COLORS.primaryHover;
  }, [plaid.step, plaid.canProceed]);

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

  return (
    <Box
      className="onboarding-shell"
      minH="calc(100dvh - var(--onboarding-top-space, 7rem))"
      h="calc(100dvh - var(--onboarding-top-space, 7rem))"
      display="flex"
      flexDirection="column"
      bg={COLORS.surface}
      position="relative"
      sx={{ '--onboarding-footer-space': '0px' }}
    >
      <Box
        as="main"
        flex="0 0 auto"
        minH={0}
        overflowY="hidden"
        overflowX="hidden"
        px={{ base: 4, md: 6 }}
        pt={{ base: 4, md: 5 }}
      >
        <VStack
          w="100%"
          maxW={{ base: '460px', md: '560px', lg: '640px' }}
          mx="auto"
          spacing={0}
          align="stretch"
          pb={2}
        >
          <Flex justify="center" mb={4}>
            <Box position="relative">
              <Box
                position="absolute"
                inset="-10px"
                borderRadius="full"
                bg={`${COLORS.primary}30`}
                filter="blur(16px)"
              />
              <Flex
                position="relative"
                w="56px"
                h="56px"
                borderRadius="16px"
                bg={COLORS.primary}
                align="center"
                justify="center"
                boxShadow="0 12px 28px rgba(58, 99, 184, 0.32)"
              >
                <WalletIcon color="#FFFFFF" />
              </Flex>
            </Box>
          </Flex>

          <Flex justify="center" mb={3}>
            <Badge
              px={3}
              py={1}
              borderRadius="full"
              bg="#EFF6FF"
              color={COLORS.primary}
              border="1px solid #DBEAFE"
              fontSize="10px"
              fontWeight="700"
              letterSpacing="0.08em"
              textTransform="uppercase"
            >
              Pre-KYC Step
            </Badge>
          </Flex>

          <Heading
            as="h1"
            textAlign="center"
            fontSize={{ base: '24px', md: '30px' }}
            lineHeight="1.12"
            letterSpacing="-0.02em"
            color={COLORS.textMain}
          >
            {headerTitle}
          </Heading>

          <Text
            textAlign="center"
            color={COLORS.textSub}
            fontSize={{ base: '14px', md: '15px' }}
            lineHeight="1.6"
            mt={2}
            mb={4}
            px={{ base: 2, md: 6 }}
          >
            {headerSubtitle}
          </Text>

          <Flex justify="center" mb={4}>
            <Flex
              align="center"
              gap={2}
              px={4}
              py={2}
              borderRadius="full"
              bg={COLORS.surfaceSoft}
              border="1px solid"
              borderColor={COLORS.border}
            >
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg={COLORS.success}
                boxShadow="0 0 8px rgba(22, 163, 74, 0.4)"
              />
              <Text fontSize="10px" color={COLORS.textSub} fontWeight="500">
                256-bit encryption | Powered by Plaid
              </Text>
            </Flex>
          </Flex>

          <VStack spacing={3} w="100%">
            <ProductCard
              title="Balance"
              icon={<WalletIcon color={COLORS.iconBlue} />}
              iconBg={COLORS.iconBlueBg}
              status={plaid.balanceStatus}
              mainValue={balanceDisplay.mainValue}
              unavailableMessage="Not available for this institution"
              errorMessage={plaid.financialData?.balance?.error || 'Failed to fetch'}
            />

            <ProductCard
              title="Assets"
              icon={<AssetsIcon color={COLORS.iconGreen} />}
              iconBg={COLORS.iconGreenBg}
              status={plaid.assetsStatus}
              mainValue={assetsDisplay.mainValue}
              unavailableMessage="Not supported by this institution"
              errorMessage={plaid.financialData?.assets?.error || 'Failed to fetch'}
            />

            <ProductCard
              title="Investments"
              icon={<InvestmentsIcon color={COLORS.iconPurple} />}
              iconBg={COLORS.iconPurpleBg}
              status={plaid.investmentsStatus}
              mainValue={investmentsDisplay.mainValue}
              unavailableMessage="No investment accounts found"
              errorMessage={plaid.financialData?.investments?.error || 'Failed to fetch'}
            />
          </VStack>

          {infoMessage && (
            <Box
              mt={3}
              p={3}
              borderRadius="14px"
              bg={COLORS.surfaceSoft}
              border="1px solid"
              borderColor={COLORS.border}
            >
              <Text textAlign="center" fontSize="13px" color={COLORS.textSub} lineHeight="1.5">
                {infoMessage}
              </Text>
            </Box>
          )}

          {plaid.error && plaid.step === 'error' && (
            <Box
              mt={3}
              p={3}
              borderRadius="14px"
              bg="#FEF2F2"
              border="1px solid #FECACA"
            >
              <Text textAlign="center" fontSize="13px" color={COLORS.error} lineHeight="1.5">
                {plaid.error}
              </Text>
            </Box>
          )}
        </VStack>
      </Box>

      <Box
        mt={2}
        position="relative"
        bg="rgba(255,255,255,0.95)"
        backdropFilter="blur(20px)"
        sx={{ WebkitBackdropFilter: 'blur(20px)' }}
        borderTop="1px solid"
        borderColor={COLORS.border}
        px={{ base: 4, md: 6 }}
        pt={3}
        pb={4}
        zIndex={50}
      >
        <Box w="100%" maxW={{ base: '460px', md: '560px', lg: '640px' }} mx="auto">
          <Button
            w="100%"
            data-onboarding-cta
            size="lg"
            bg={buttonBg}
            color="white"
            borderRadius="16px"
            h="54px"
            fontSize="16px"
            fontWeight="600"
            isDisabled={isInitializing || isProcessing}
            isLoading={isInitializing || isProcessing}
            loadingText={buttonText}
            leftIcon={isInitializing || isProcessing ? undefined : <LockIcon />}
            _hover={{
              bg: buttonHoverBg,
              transform: 'translateY(-1px)',
              boxShadow: '0 10px 32px rgba(58, 99, 184, 0.28)',
            }}
            _active={{ transform: 'translateY(0)' }}
            _disabled={{
              bg: '#CBD5E1',
              color: '#94A3B8',
              cursor: 'not-allowed',
              boxShadow: 'none',
            }}
            transition="all 0.2s ease"
            onClick={handleButtonClick}
            aria-label={buttonText}
          >
            {buttonText}
          </Button>

          {(plaid.step === 'done' || plaid.step === 'error') && (
            <Button
              mt={2}
              w="100%"
              variant="ghost"
              size="sm"
              color={COLORS.textSub}
              fontWeight="500"
              _hover={{ bg: COLORS.surfaceSoft, color: COLORS.textMain }}
              onClick={plaid.retry}
            >
              {plaid.step === 'done' && plaid.canProceed ? 'Link a different account' : 'Try a different account'}
            </Button>
          )}

          <Text
            mt={3}
            textAlign="center"
            fontSize="10px"
            color={COLORS.textMuted}
            textTransform="uppercase"
            letterSpacing="0.08em"
            fontWeight="600"
          >
            {bankName} x Hushh Financial Verification
          </Text>

          {onSkip && (
            <Button
              mt={2}
              w="100%"
              size="sm"
              variant="ghost"
              color={COLORS.textSub}
              fontWeight="500"
              rightIcon={<ArrowRightIcon />}
              _hover={{ color: COLORS.textMain, bg: COLORS.surfaceSoft }}
              onClick={onSkip}
              aria-label="Skip financial verification for now"
            >
              Skip for now
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default KycFinancialLinkScreen;
