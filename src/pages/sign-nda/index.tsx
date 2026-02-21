/**
 * Sign NDA Page
 * 
 * iOS-first design: white background, black text, system blue (#007AFF) accent.
 * Production-level auth lifecycle with active session monitoring.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Checkbox,
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Container,
  useToast,
  HStack,
  Flex,
  Spinner,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import config from '../../resources/config/config';
import { signNDA, sendNDANotification, generateNDAPdf, uploadSignedNDA } from '../../services/nda/ndaService';

const MotionBox = motion(Box);

/* iOS system colors */
const COLORS = {
  primary: '#2F80ED',
  primaryHover: '#2570D3',
  text: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  separator: '#C6C6C8',
  separatorLight: '#E5E5EA',
  bg: '#FFFFFF',
  bgGrouped: '#F2F2F7',
  success: '#34C759',
  destructive: '#FF3B30',
};

const SignNDAPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const isMountedRef = useRef(true);

  const [isLoading, setIsLoading] = useState(true);
  const [signerName, setSignerName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [nameError, setNameError] = useState('');
  const [termsError, setTermsError] = useState('');

  // Cleanup on unmount — prevents setState on unmounted component
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // Auth lifecycle: validate session + listen for changes
  useEffect(() => {
    if (!config.supabaseClient) {
      if (isMountedRef.current) setIsLoading(false);
      return;
    }

    // Use onAuthStateChange as the single source of truth.
    // It fires immediately with the current session on mount,
    // and again whenever the session changes (login, logout, token refresh).
    const {
      data: { subscription },
    } = config.supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (!isMountedRef.current) return;

      if (!session?.user) {
        // No valid session — redirect to login
        navigate('/login', { replace: true });
        return;
      }

      // Valid session — populate user info
      setUserId(session.user.id);
      setUserEmail(session.user.email || null);

      const fullName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name || '';
      if (fullName && !signerName) {
        setSignerName(fullName);
      }

      setIsLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, [navigate]);

  const validateForm = useCallback((): boolean => {
    let isValid = true;

    const trimmedName = signerName.trim();
    if (!trimmedName) {
      setNameError('Please enter your full legal name');
      isValid = false;
    } else if (trimmedName.length < 2) {
      setNameError('Name must be at least 2 characters');
      isValid = false;
    } else {
      setNameError('');
    }

    if (!agreedToTerms) {
      setTermsError('You must agree to the NDA terms');
      isValid = false;
    } else {
      setTermsError('');
    }

    return isValid;
  }, [signerName, agreedToTerms]);

  const handleSignNDA = useCallback(async () => {
    if (!validateForm()) return;
    if (isSubmitting) return;

    // Re-validate session right before signing
    if (!config.supabaseClient || !userId) {
      toast({
        title: 'Session expired',
        description: 'Please log in again.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      navigate('/login', { replace: true });
      return;
    }

    setIsSubmitting(true);

    try {
      // Re-fetch session to ensure token is fresh
      const { data: { session } } = await config.supabaseClient.auth.getSession();
      if (!session) {
        toast({
          title: 'Session expired',
          description: 'Your session has expired. Please log in again.',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        navigate('/login', { replace: true });
        return;
      }

      const accessToken = session.access_token;
      const trimmedName = signerName.trim();
      let generatedPdfUrl: string | undefined;
      let pdfBlob: Blob | undefined;

      // PDF generation — non-blocking, failure doesn't stop NDA signing
      try {
        if (accessToken) {
          const pdfResult = await generateNDAPdf(
            {
              signerName: trimmedName,
              signerEmail: userEmail || 'unknown@email.com',
              signedAt: new Date().toISOString(),
              ndaVersion: 'v1.0',
              userId,
            },
            accessToken
          );

          if (pdfResult.success && pdfResult.blob) {
            pdfBlob = pdfResult.blob;
            const uploadResult = await uploadSignedNDA(userId, pdfResult.blob);
            if (uploadResult.success && uploadResult.url) {
              generatedPdfUrl = uploadResult.url;
            }
          }
        }
      } catch (pdfError) {
        console.warn('[SignNDA] PDF generation/upload failed, continuing:', pdfError);
      }

      // Sign NDA via Supabase RPC
      const result = await signNDA(trimmedName, 'v1.0', generatedPdfUrl);

      if (!isMountedRef.current) return;

      if (result.success) {
        // Send notification — fire and forget, don't block user
        sendNDANotification(
          trimmedName,
          userEmail || 'unknown@email.com',
          result.signedAt || new Date().toISOString(),
          result.ndaVersion || 'v1.0',
          generatedPdfUrl,
          pdfBlob,
          userId
        ).catch((err) => console.error('[SignNDA] Notification failed:', err));

        toast({
          title: 'NDA Signed Successfully',
          description: 'Thank you for signing the Non-Disclosure Agreement.',
          status: 'success',
          duration: 4000,
          isClosable: true,
        });

        const redirectTo = sessionStorage.getItem('nda_redirect_after') || '/';
        sessionStorage.removeItem('nda_redirect_after');
        navigate(redirectTo, { replace: true });
      } else {
        toast({
          title: 'Error Signing NDA',
          description: result.error || 'An error occurred. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('[SignNDA] Unexpected error:', error);
      if (isMountedRef.current) {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      if (isMountedRef.current) setIsSubmitting(false);
    }
  }, [validateForm, isSubmitting, userId, userEmail, signerName, navigate, toast]);

  // Don't flash UI while checking auth
  if (isLoading) {
    return (
      <Flex minH="100dvh" bg={COLORS.bg} align="center" justify="center">
        <Spinner size="lg" color={COLORS.primary} />
      </Flex>
    );
  }

  return (
    <Box
      minH="100dvh"
      bg={COLORS.bg}
      sx={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif' }}
    >
      {/* Header */}
      <Box
        bg={COLORS.bg}
        pt={{ base: 6, md: 14 }}
        pb={{ base: 6, md: 10 }}
        px={4}
        borderBottom="0.5px solid"
        borderColor={COLORS.separatorLight}
      >
        <Container maxW="container.md">
          <VStack spacing={3} textAlign="center">
            {/* Icon */}
            <Flex
              w="64px"
              h="64px"
              borderRadius="16px"
              bg={COLORS.primary}
              align="center"
              justify="center"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </Flex>

            <Heading
              as="h1"
              fontSize={{ base: '28px', md: '34px' }}
              color={COLORS.text}
              fontWeight="700"
              letterSpacing="-0.02em"
              lineHeight="1.15"
            >
              Non-Disclosure Agreement
            </Heading>

            <Text
              color={COLORS.textTertiary}
              fontSize={{ base: '15px', md: '16px' }}
              maxW="md"
              lineHeight="1.5"
            >
              Review and sign to access confidential investment materials.
            </Text>
          </VStack>
        </Container>
      </Box>

      {/* Content */}
      <Container maxW="container.md" py={{ base: 5, md: 8 }} px={4}>
        <MotionBox
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Security note */}
          <HStack
            spacing={2}
            bg={COLORS.bgGrouped}
            px={4}
            py={3}
            borderRadius="12px"
            mb={6}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <Text color={COLORS.textTertiary} fontSize="13px" fontWeight="500">
              Encrypted &amp; legally binding · GDPR compliant
            </Text>
          </HStack>

          {/* NDA Document Card */}
          <Box
            bg={COLORS.bg}
            borderRadius="16px"
            border="0.5px solid"
            borderColor={COLORS.separatorLight}
            overflow="hidden"
            mb={6}
          >
            {/* Section header — iOS grouped style */}
            <Box px={{ base: 5, md: 6 }} pt={5} pb={2}>
              <Text
                color={COLORS.textTertiary}
                fontSize="13px"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="0.02em"
              >
                Agreement Terms
              </Text>
            </Box>

            <Box px={{ base: 5, md: 6 }} pb={6}>
              <VStack align="stretch" spacing={5}>
                {/* NDA Terms — Scrollable */}
                <Box
                  maxH="320px"
                  overflowY="auto"
                  bg={COLORS.bgGrouped}
                  p={{ base: 4, md: 5 }}
                  borderRadius="12px"
                  css={{
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': {
                      background: COLORS.separator,
                      borderRadius: '10px',
                    },
                  }}
                >
                  <VStack align="stretch" spacing={5}>
                    <Heading size="sm" color={COLORS.text} fontWeight="700" fontSize="15px">
                      MUTUAL NON-DISCLOSURE AGREEMENT
                    </Heading>

                    <Text color={COLORS.textSecondary} fontSize="14px" lineHeight="1.65">
                      This Non-Disclosure Agreement (&quot;Agreement&quot;) is entered into between
                      Hushh Technologies LLC (&quot;Hushh&quot;) and the undersigned party (&quot;Recipient&quot;).
                    </Text>

                    {[
                      {
                        title: '1. Definition of Confidential Information',
                        body: '"Confidential Information" means any non-public information disclosed by Hushh to the Recipient, including but not limited to: business strategies, financial information, investment strategies, fund performance data, technical specifications, proprietary algorithms, AI models, trade secrets, and any other information marked as confidential or that reasonably should be understood to be confidential.',
                      },
                      {
                        title: '2. Obligations of the Recipient',
                        body: 'The Recipient agrees to: (a) hold Confidential Information in strict confidence; (b) not disclose Confidential Information to any third party without prior written consent; (c) use Confidential Information solely for evaluating a potential relationship with Hushh; (d) take reasonable measures to protect the confidentiality of such information.',
                      },
                      {
                        title: '3. Exceptions',
                        body: 'This Agreement does not apply to information that: (a) is or becomes publicly available through no fault of the Recipient; (b) was known to the Recipient prior to disclosure; (c) is independently developed by the Recipient; (d) is disclosed pursuant to a court order or legal requirement.',
                      },
                      {
                        title: '4. Term and Termination',
                        body: 'This Agreement shall remain in effect for a period of three (3) years from the date of execution. The obligations of confidentiality shall survive the termination of this Agreement.',
                      },
                      {
                        title: '5. Governing Law',
                        body: 'This Agreement shall be governed by the laws of the State of Delaware, United States of America, without regard to its conflict of laws principles.',
                      },
                      {
                        title: '6. Acknowledgment',
                        body: 'By signing below, the Recipient acknowledges that they have read, understood, and agree to be bound by the terms of this Non-Disclosure Agreement. The Recipient further acknowledges that any breach of this Agreement may result in irreparable harm to Hushh and that Hushh shall be entitled to seek injunctive relief in addition to any other remedies available at law.',
                      },
                    ].map((section) => (
                      <Box key={section.title}>
                        <Text color={COLORS.primary} fontSize="12px" fontWeight="700" textTransform="uppercase" letterSpacing="0.04em" mb={1}>
                          {section.title}
                        </Text>
                        <Text color={COLORS.textSecondary} fontSize="14px" lineHeight="1.65">
                          {section.body}
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </Box>

                {/* Separator */}
                <Box h="0.5px" bg={COLORS.separatorLight} />

                {/* Digital Signature Section */}
                <VStack align="stretch" spacing={4}>
                  <Text
                    color={COLORS.textTertiary}
                    fontSize="13px"
                    fontWeight="600"
                    textTransform="uppercase"
                    letterSpacing="0.02em"
                  >
                    Digital Signature
                  </Text>

                  <FormControl isInvalid={!!nameError}>
                    <FormLabel color={COLORS.textSecondary} fontSize="14px" fontWeight="600">
                      Full Legal Name
                    </FormLabel>
                    <Input
                      value={signerName}
                      onChange={(e) => {
                        setSignerName(e.target.value);
                        if (nameError) setNameError('');
                      }}
                      placeholder="Enter your full legal name"
                      bg={COLORS.bg}
                      border="1px solid"
                      borderColor={COLORS.separatorLight}
                      color={COLORS.text}
                      _placeholder={{ color: COLORS.separator }}
                      _hover={{ borderColor: COLORS.separator }}
                      _focus={{
                        borderColor: COLORS.primary,
                        boxShadow: `0 0 0 3px ${COLORS.primary}20`,
                      }}
                      size="lg"
                      fontSize="17px"
                      borderRadius="12px"
                      h="50px"
                    />
                    <FormErrorMessage>{nameError}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!termsError}>
                    <Box
                      bg={agreedToTerms ? `${COLORS.primary}08` : COLORS.bgGrouped}
                      border="0.5px solid"
                      borderColor={agreedToTerms ? `${COLORS.primary}40` : COLORS.separatorLight}
                      borderRadius="12px"
                      p={4}
                      transition="all 0.2s"
                    >
                      <Checkbox
                        isChecked={agreedToTerms}
                        onChange={(e) => {
                          setAgreedToTerms(e.target.checked);
                          if (termsError) setTermsError('');
                        }}
                        colorScheme="blue"
                        size="lg"
                        sx={{
                          '[data-checked] > span:first-of-type': {
                            bg: COLORS.primary,
                            borderColor: COLORS.primary,
                          },
                        }}
                      >
                        <Text color={COLORS.textSecondary} fontSize="14px" lineHeight="1.55">
                          I have read, understood, and agree to the terms of this Non-Disclosure
                          Agreement. I acknowledge that this constitutes my legal electronic signature.
                        </Text>
                      </Checkbox>
                    </Box>
                    {termsError && (
                      <Text color={COLORS.destructive} fontSize="12px" mt={2} fontWeight="500">
                        {termsError}
                      </Text>
                    )}
                  </FormControl>

                  {/* Signing as info */}
                  {userEmail && (
                    <HStack spacing={2} px={1}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={COLORS.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <Text color={COLORS.textTertiary} fontSize="13px" fontWeight="500">
                        Signing as{' '}
                        <Text as="span" color={COLORS.text} fontWeight="600">
                          {userEmail}
                        </Text>
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </VStack>
            </Box>
          </Box>

          {/* Submit Button */}
          <Button
            onClick={handleSignNDA}
            isLoading={isSubmitting}
            loadingText="Signing..."
            size="lg"
            width="full"
            bg={COLORS.primary}
            color="white"
            _hover={{ bg: COLORS.primaryHover }}
            _active={{ opacity: 0.8 }}
            isDisabled={!agreedToTerms || !signerName.trim() || isSubmitting}
            borderRadius="12px"
            fontWeight="600"
            h="50px"
            fontSize="17px"
            transition="all 0.15s"
          >
            Sign &amp; Continue
          </Button>

          {/* Footer Note */}
          <Text
            color={COLORS.textTertiary}
            fontSize="12px"
            textAlign="center"
            mt={5}
            lineHeight="1.5"
            maxW="sm"
            mx="auto"
          >
            By signing, you agree that your digital signature has the same legal validity
            as a handwritten signature under applicable electronic signature laws.
          </Text>
        </MotionBox>
      </Container>
    </Box>
  );
};

export default SignNDAPage;
