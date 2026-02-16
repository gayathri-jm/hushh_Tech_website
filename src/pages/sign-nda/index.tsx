/**
 * Sign NDA Page
 * 
 * Clean white background with black text and bright primary accent colors.
 * Modern, professional design with vibrant blue/teal accents.
 */

import React, { useState, useEffect } from 'react';
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
  Icon,
  Badge,
  Flex,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaFileSignature, FaShieldAlt, FaCheckCircle, FaLock, FaUserCheck } from 'react-icons/fa';
import config from '../../resources/config/config';
import { signNDA, sendNDANotification, generateNDAPdf, uploadSignedNDA } from '../../services/nda/ndaService';

const MotionBox = motion(Box);

/* Bright primary color palette */
const COLORS = {
  primary: '#0066FF',
  primaryHover: '#0052CC',
  primaryLight: '#E6F0FF',
  accent: '#00C9A7',
  accentLight: '#E6FFF9',
  warning: '#FF6B35',
  text: '#111111',
  textSecondary: '#4A4A4A',
  textMuted: '#71717A',
  border: '#E4E4E7',
  bg: '#FFFFFF',
  bgSubtle: '#FAFAFA',
  success: '#22C55E',
};

const SignNDAPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [signerName, setSignerName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [nameError, setNameError] = useState('');
  const [termsError, setTermsError] = useState('');

  useEffect(() => {
    const getSession = async () => {
      if (!config.supabaseClient) return;
      
      const { data: { session } } = await config.supabaseClient.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        
        const fullName = session.user.user_metadata?.full_name || 
                        session.user.user_metadata?.name || '';
        if (fullName) setSignerName(fullName);
      } else {
        navigate('/Login', { replace: true });
      }
    };
    
    getSession();
  }, [navigate]);

  const validateForm = (): boolean => {
    let isValid = true;
    
    if (!signerName.trim()) {
      setNameError('Please enter your full legal name');
      isValid = false;
    } else if (signerName.trim().length < 2) {
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
  };

  const handleSignNDA = async () => {
    if (!validateForm()) return;
    if (!userId) {
      toast({
        title: 'Error',
        description: 'User session not found. Please log in again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let accessToken = '';
      let generatedPdfUrl: string | undefined;
      let pdfBlob: Blob | undefined;
      
      try {
        if (config.supabaseClient) {
          const { data: { session } } = await config.supabaseClient.auth.getSession();
          accessToken = session?.access_token || '';
        }
        
        if (accessToken) {
          const pdfResult = await generateNDAPdf(
            {
              signerName: signerName.trim(),
              signerEmail: userEmail || 'unknown@email.com',
              signedAt: new Date().toISOString(),
              ndaVersion: 'v1.0',
              userId: userId,
            },
            accessToken
          );
          
          if (pdfResult.success && pdfResult.blob) {
            pdfBlob = pdfResult.blob;
            const uploadResult = await uploadSignedNDA(userId, pdfResult.blob);
            if (uploadResult.success && uploadResult.url) {
              generatedPdfUrl = uploadResult.url;
              setPdfUrl(generatedPdfUrl);
            }
          }
        }
      } catch (pdfError) {
        console.warn('PDF generation/upload failed, continuing without PDF:', pdfError);
      }
      
      const result = await signNDA(signerName.trim(), 'v1.0', generatedPdfUrl);
      
      if (result.success) {
        try {
          await sendNDANotification(
            signerName.trim(),
            userEmail || 'unknown@email.com',
            result.signedAt || new Date().toISOString(),
            result.ndaVersion || 'v1.0',
            generatedPdfUrl,
            pdfBlob,
            userId
          );
        } catch (notificationError) {
          console.error('Failed to send NDA notification:', notificationError);
        }
        
        toast({
          title: 'NDA Signed Successfully',
          description: 'Thank you for signing the Non-Disclosure Agreement.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        const redirectTo = sessionStorage.getItem('nda_redirect_after') || '/';
        sessionStorage.removeItem('nda_redirect_after');
        navigate(redirectTo, { replace: true });
      } else {
        toast({
          title: 'Error Signing NDA',
          description: result.error || 'An error occurred while signing the NDA.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error signing NDA:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box minH="100vh" bg={COLORS.bg}>
      {/* Hero Header - White bg with bright accent */}
      <Box
        bg={COLORS.bg}
        pt={{ base: 10, md: 16 }}
        pb={{ base: 8, md: 12 }}
        px={4}
        borderBottom="1px solid"
        borderColor={COLORS.border}
        position="relative"
        overflow="hidden"
      >
        {/* Subtle decorative gradient blob */}
        <Box
          position="absolute"
          top="-80px"
          right="-80px"
          w="300px"
          h="300px"
          borderRadius="full"
          bg={`linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.accentLight})`}
          opacity={0.6}
          filter="blur(60px)"
          pointerEvents="none"
        />
        <Box
          position="absolute"
          bottom="-60px"
          left="-60px"
          w="200px"
          h="200px"
          borderRadius="full"
          bg={COLORS.primaryLight}
          opacity={0.4}
          filter="blur(50px)"
          pointerEvents="none"
        />

        <Container maxW="container.md" position="relative" zIndex={1}>
          <VStack spacing={4} textAlign="center">
            {/* Icon with bright gradient background */}
            <Flex
              w="72px"
              h="72px"
              borderRadius="20px"
              bg={`linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`}
              align="center"
              justify="center"
              boxShadow={`0 8px 24px ${COLORS.primary}33`}
            >
              <Icon as={FaFileSignature} boxSize={8} color="white" />
            </Flex>

            <Badge
              bg={COLORS.primaryLight}
              color={COLORS.primary}
              px={3}
              py={1}
              borderRadius="full"
              fontSize="xs"
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing="0.05em"
            >
              Secure Document
            </Badge>

            <Heading
              as="h1"
              fontSize={{ base: '2xl', md: '3xl' }}
              color={COLORS.text}
              fontWeight="700"
              letterSpacing="-0.02em"
              lineHeight="1.2"
            >
              Non-Disclosure Agreement
            </Heading>

            <Text
              color={COLORS.textMuted}
              fontSize={{ base: 'sm', md: 'md' }}
              maxW="md"
              lineHeight="1.6"
            >
              Review and sign our NDA to access confidential platform information 
              and investment materials.
            </Text>
          </VStack>
        </Container>
      </Box>

      {/* Content Area */}
      <Container maxW="container.md" py={{ base: 6, md: 10 }} px={4}>
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Trust Indicators */}
          <Flex
            gap={{ base: 3, md: 4 }}
            mb={8}
            direction={{ base: 'column', sm: 'row' }}
          >
            {[
              { icon: FaShieldAlt, label: 'Encrypted & Secure', color: COLORS.primary },
              { icon: FaUserCheck, label: 'Legally Binding', color: COLORS.accent },
              { icon: FaLock, label: 'GDPR Compliant', color: COLORS.warning },
            ].map((item) => (
              <HStack
                key={item.label}
                flex={1}
                bg={COLORS.bgSubtle}
                border="1px solid"
                borderColor={COLORS.border}
                borderRadius="xl"
                p={3}
                spacing={3}
              >
                <Flex
                  w="36px"
                  h="36px"
                  borderRadius="10px"
                  bg={`${item.color}12`}
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Icon as={item.icon} color={item.color} boxSize={4} />
                </Flex>
                <Text color={COLORS.textSecondary} fontSize="xs" fontWeight="600">
                  {item.label}
                </Text>
              </HStack>
            ))}
          </Flex>

          {/* NDA Document Card */}
          <Box
            bg={COLORS.bg}
            borderRadius="2xl"
            border="1px solid"
            borderColor={COLORS.border}
            overflow="hidden"
            mb={6}
            boxShadow="0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)"
          >
            {/* Card Header */}
            <Box
              bg={COLORS.bgSubtle}
              px={{ base: 5, md: 8 }}
              py={4}
              borderBottom="1px solid"
              borderColor={COLORS.border}
            >
              <HStack justify="space-between" align="center">
                <HStack spacing={3}>
                  <Box w="3px" h="20px" borderRadius="full" bg={COLORS.primary} />
                  <Text color={COLORS.text} fontWeight="700" fontSize="sm" textTransform="uppercase" letterSpacing="0.04em">
                    Agreement Terms
                  </Text>
                </HStack>
                <Badge
                  bg={`${COLORS.success}15`}
                  color={COLORS.success}
                  px={2}
                  py={0.5}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight="600"
                >
                  v1.0
                </Badge>
              </HStack>
            </Box>

            <Box px={{ base: 5, md: 8 }} py={6}>
              <VStack align="stretch" spacing={6}>
                {/* NDA Terms - Scrollable */}
                <Box
                  maxH="320px"
                  overflowY="auto"
                  bg={COLORS.bgSubtle}
                  p={{ base: 4, md: 6 }}
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={COLORS.border}
                  css={{
                    '&::-webkit-scrollbar': { width: '5px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { 
                      background: COLORS.border, 
                      borderRadius: '10px' 
                    },
                    '&::-webkit-scrollbar-thumb:hover': { 
                      background: '#C4C4C4' 
                    },
                  }}
                >
                  <VStack align="stretch" spacing={5}>
                    <Heading size="sm" color={COLORS.text} fontWeight="700">
                      MUTUAL NON-DISCLOSURE AGREEMENT
                    </Heading>
                    
                    <Text color={COLORS.textSecondary} fontSize="sm" lineHeight="1.7">
                      This Non-Disclosure Agreement (&quot;Agreement&quot;) is entered into between 
                      Hushh Technologies LLC (&quot;Hushh&quot;) and the undersigned party (&quot;Recipient&quot;).
                    </Text>
                    
                    <Box>
                      <Text color={COLORS.primary} fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" mb={1.5}>
                        1. Definition of Confidential Information
                      </Text>
                      <Text color={COLORS.textSecondary} fontSize="sm" lineHeight="1.7">
                        &quot;Confidential Information&quot; means any non-public information disclosed by Hushh 
                        to the Recipient, including but not limited to: business strategies, financial 
                        information, investment strategies, fund performance data, technical specifications, 
                        proprietary algorithms, AI models, trade secrets, and any other information marked 
                        as confidential or that reasonably should be understood to be confidential.
                      </Text>
                    </Box>
                    
                    <Box>
                      <Text color={COLORS.primary} fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" mb={1.5}>
                        2. Obligations of the Recipient
                      </Text>
                      <Text color={COLORS.textSecondary} fontSize="sm" lineHeight="1.7">
                        The Recipient agrees to: (a) hold Confidential Information in strict confidence; 
                        (b) not disclose Confidential Information to any third party without prior written 
                        consent; (c) use Confidential Information solely for evaluating a potential 
                        relationship with Hushh; (d) take reasonable measures to protect the confidentiality 
                        of such information.
                      </Text>
                    </Box>
                    
                    <Box>
                      <Text color={COLORS.primary} fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" mb={1.5}>
                        3. Exceptions
                      </Text>
                      <Text color={COLORS.textSecondary} fontSize="sm" lineHeight="1.7">
                        This Agreement does not apply to information that: (a) is or becomes publicly 
                        available through no fault of the Recipient; (b) was known to the Recipient 
                        prior to disclosure; (c) is independently developed by the Recipient; (d) is 
                        disclosed pursuant to a court order or legal requirement.
                      </Text>
                    </Box>
                    
                    <Box>
                      <Text color={COLORS.primary} fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" mb={1.5}>
                        4. Term and Termination
                      </Text>
                      <Text color={COLORS.textSecondary} fontSize="sm" lineHeight="1.7">
                        This Agreement shall remain in effect for a period of three (3) years from 
                        the date of execution. The obligations of confidentiality shall survive the 
                        termination of this Agreement.
                      </Text>
                    </Box>
                    
                    <Box>
                      <Text color={COLORS.primary} fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" mb={1.5}>
                        5. Governing Law
                      </Text>
                      <Text color={COLORS.textSecondary} fontSize="sm" lineHeight="1.7">
                        This Agreement shall be governed by the laws of the State of Delaware, 
                        United States of America, without regard to its conflict of laws principles.
                      </Text>
                    </Box>
                    
                    <Box>
                      <Text color={COLORS.primary} fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.06em" mb={1.5}>
                        6. Acknowledgment
                      </Text>
                      <Text color={COLORS.textSecondary} fontSize="sm" lineHeight="1.7">
                        By signing below, the Recipient acknowledges that they have read, understood, 
                        and agree to be bound by the terms of this Non-Disclosure Agreement. The Recipient 
                        further acknowledges that any breach of this Agreement may result in irreparable 
                        harm to Hushh and that Hushh shall be entitled to seek injunctive relief in 
                        addition to any other remedies available at law.
                      </Text>
                    </Box>
                  </VStack>
                </Box>

                {/* Divider with accent */}
                <Box h="2px" bg={`linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent}, transparent)`} borderRadius="full" />

                {/* Signature Section */}
                <VStack align="stretch" spacing={5}>
                  <HStack spacing={3}>
                    <Box w="3px" h="20px" borderRadius="full" bg={COLORS.accent} />
                    <Text color={COLORS.text} fontWeight="700" fontSize="sm" textTransform="uppercase" letterSpacing="0.04em">
                      Digital Signature
                    </Text>
                  </HStack>
                  
                  <FormControl isInvalid={!!nameError}>
                    <FormLabel color={COLORS.textSecondary} fontSize="sm" fontWeight="600">
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
                      border="2px solid"
                      borderColor={COLORS.border}
                      color={COLORS.text}
                      _placeholder={{ color: '#B4B4B4' }}
                      _hover={{ borderColor: COLORS.primary }}
                      _focus={{ 
                        borderColor: COLORS.primary, 
                        boxShadow: `0 0 0 3px ${COLORS.primary}20` 
                      }}
                      size="lg"
                      fontFamily="'Caveat', cursive, system-ui"
                      fontSize="xl"
                      borderRadius="xl"
                      h="56px"
                    />
                    <FormErrorMessage>{nameError}</FormErrorMessage>
                  </FormControl>

                  <FormControl isInvalid={!!termsError}>
                    <Box
                      bg={agreedToTerms ? `${COLORS.primary}08` : COLORS.bgSubtle}
                      border="1px solid"
                      borderColor={agreedToTerms ? `${COLORS.primary}40` : COLORS.border}
                      borderRadius="xl"
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
                        <Text color={COLORS.textSecondary} fontSize="sm" lineHeight="1.6">
                          I have read, understood, and agree to the terms of this Non-Disclosure 
                          Agreement. I acknowledge that this constitutes my legal electronic signature.
                        </Text>
                      </Checkbox>
                    </Box>
                    {termsError && (
                      <Text color="red.500" fontSize="xs" mt={2} fontWeight="500">
                        {termsError}
                      </Text>
                    )}
                  </FormControl>

                  {/* User Info */}
                  {userEmail && (
                    <HStack
                      spacing={2}
                      bg={COLORS.accentLight}
                      px={4}
                      py={2.5}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={`${COLORS.accent}30`}
                    >
                      <Icon as={FaLock} color={COLORS.accent} boxSize={3} />
                      <Text color={COLORS.textSecondary} fontSize="xs" fontWeight="500">
                        Signing as: <Text as="span" color={COLORS.text} fontWeight="700">{userEmail}</Text>
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
            loadingText="Signing NDA..."
            size="lg"
            width="full"
            bg={`linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`}
            color="white"
            _hover={{
              bg: `linear-gradient(135deg, ${COLORS.primaryHover}, ${COLORS.accent})`,
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 24px ${COLORS.primary}40`,
            }}
            _active={{
              transform: 'translateY(0)',
              boxShadow: `0 4px 12px ${COLORS.primary}30`,
            }}
            leftIcon={<FaCheckCircle />}
            isDisabled={!agreedToTerms || !signerName.trim() || isSubmitting}
            borderRadius="xl"
            fontWeight="600"
            h="56px"
            fontSize="md"
            transition="all 0.2s"
          >
            Sign & Continue
          </Button>

          {/* Footer Note */}
          <Text
            color={COLORS.textMuted}
            fontSize="xs"
            textAlign="center"
            mt={6}
            lineHeight="1.6"
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
