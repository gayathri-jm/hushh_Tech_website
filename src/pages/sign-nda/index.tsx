/**
 * Sign NDA Page
 * 
 * This page is shown to authenticated users who haven't signed the NDA yet.
 * They must sign the NDA before accessing any protected routes.
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
  Spinner,
  useToast,
  Divider,
  HStack,
  Icon,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { FaFileSignature, FaShieldAlt, FaCheckCircle, FaLock } from 'react-icons/fa';
import config from '../../resources/config/config';
import { signNDA, generateNDAPdf, uploadSignedNDA } from '../../services/nda/ndaService';

const MotionBox = motion(Box);

const SignNDAPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // Form state
  const [signerName, setSignerName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // Form validation
  const [nameError, setNameError] = useState('');
  const [termsError, setTermsError] = useState('');

  // Get user session
  useEffect(() => {
    const getSession = async () => {
      if (!config.supabaseClient) return;
      
      const { data: { session } } = await config.supabaseClient.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        
        // Pre-fill name from user metadata if available
        const fullName = session.user.user_metadata?.full_name || 
                        session.user.user_metadata?.name || '';
        if (fullName) {
          setSignerName(fullName);
        }
      } else {
        // If no session, redirect to login
        navigate('/Login', { replace: true });
      }
    };
    
    getSession();
  }, [navigate]);

  // Validate form
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

  // Handle NDA signing
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
      // Sign the NDA
      const result = await signNDA(signerName.trim(), 'v1.0', pdfUrl || undefined);
      
      if (result.success) {
        toast({
          title: 'NDA Signed Successfully',
          description: 'Thank you for signing the Non-Disclosure Agreement.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Get the redirect destination
        const redirectTo = sessionStorage.getItem('nda_redirect_after') || '/';
        sessionStorage.removeItem('nda_redirect_after');
        
        // Navigate to the intended destination
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
    <Box
      minH="100vh"
      bg="linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)"
      py={{ base: 8, md: 16 }}
      px={4}
    >
      <Container maxW="container.md">
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <VStack spacing={4} mb={8} textAlign="center">
            <Icon as={FaFileSignature} boxSize={12} color="cyan.400" />
            <Heading
              as="h1"
              size="xl"
              bgGradient="linear(to-r, cyan.400, blue.500)"
              bgClip="text"
            >
              Non-Disclosure Agreement
            </Heading>
            <Text color="gray.400" maxW="md">
              Before accessing the platform, please review and sign our NDA to protect 
              confidential information.
            </Text>
          </VStack>

          {/* NDA Document */}
          <Box
            bg="whiteAlpha.50"
            borderRadius="xl"
            border="1px solid"
            borderColor="whiteAlpha.100"
            p={{ base: 4, md: 8 }}
            mb={8}
          >
            <VStack align="stretch" spacing={6}>
              {/* Security Notice */}
              <HStack
                bg="rgba(49, 130, 206, 0.15)"
                p={4}
                borderRadius="lg"
                border="1px solid"
                borderColor="blue.500"
              >
                <Icon as={FaShieldAlt} color="blue.400" boxSize={5} />
                <Text color="blue.300" fontSize="sm">
                  This agreement protects both you and Hushh. Your signature will be 
                  securely recorded with timestamp and IP address for verification.
                </Text>
              </HStack>

              {/* NDA Terms */}
              <Box
                maxH="300px"
                overflowY="auto"
                bg="blackAlpha.400"
                p={6}
                borderRadius="lg"
                border="1px solid"
                borderColor="whiteAlpha.100"
                css={{
                  '&::-webkit-scrollbar': { width: '6px' },
                  '&::-webkit-scrollbar-track': { background: 'transparent' },
                  '&::-webkit-scrollbar-thumb': { 
                    background: 'rgba(255,255,255,0.2)', 
                    borderRadius: '3px' 
                  },
                }}
              >
                <VStack align="stretch" spacing={4}>
                  <Heading size="sm" color="white">
                    MUTUAL NON-DISCLOSURE AGREEMENT
                  </Heading>
                  
                  <Text color="gray.300" fontSize="sm" lineHeight="tall">
                    This Non-Disclosure Agreement ("Agreement") is entered into between 
                    Hushh Technologies LLC ("Hushh") and the undersigned party ("Recipient").
                  </Text>
                  
                  <Heading size="xs" color="white">1. Definition of Confidential Information</Heading>
                  <Text color="gray.300" fontSize="sm" lineHeight="tall">
                    "Confidential Information" means any non-public information disclosed by Hushh 
                    to the Recipient, including but not limited to: business strategies, financial 
                    information, investment strategies, fund performance data, technical specifications, 
                    proprietary algorithms, AI models, trade secrets, and any other information marked 
                    as confidential or that reasonably should be understood to be confidential.
                  </Text>
                  
                  <Heading size="xs" color="white">2. Obligations of the Recipient</Heading>
                  <Text color="gray.300" fontSize="sm" lineHeight="tall">
                    The Recipient agrees to: (a) hold Confidential Information in strict confidence; 
                    (b) not disclose Confidential Information to any third party without prior written 
                    consent; (c) use Confidential Information solely for evaluating a potential 
                    relationship with Hushh; (d) take reasonable measures to protect the confidentiality 
                    of such information.
                  </Text>
                  
                  <Heading size="xs" color="white">3. Exceptions</Heading>
                  <Text color="gray.300" fontSize="sm" lineHeight="tall">
                    This Agreement does not apply to information that: (a) is or becomes publicly 
                    available through no fault of the Recipient; (b) was known to the Recipient 
                    prior to disclosure; (c) is independently developed by the Recipient; (d) is 
                    disclosed pursuant to a court order or legal requirement.
                  </Text>
                  
                  <Heading size="xs" color="white">4. Term and Termination</Heading>
                  <Text color="gray.300" fontSize="sm" lineHeight="tall">
                    This Agreement shall remain in effect for a period of three (3) years from 
                    the date of execution. The obligations of confidentiality shall survive the 
                    termination of this Agreement.
                  </Text>
                  
                  <Heading size="xs" color="white">5. Governing Law</Heading>
                  <Text color="gray.300" fontSize="sm" lineHeight="tall">
                    This Agreement shall be governed by the laws of the State of Delaware, 
                    United States of America, without regard to its conflict of laws principles.
                  </Text>
                  
                  <Heading size="xs" color="white">6. Acknowledgment</Heading>
                  <Text color="gray.300" fontSize="sm" lineHeight="tall">
                    By signing below, the Recipient acknowledges that they have read, understood, 
                    and agree to be bound by the terms of this Non-Disclosure Agreement. The Recipient 
                    further acknowledges that any breach of this Agreement may result in irreparable 
                    harm to Hushh and that Hushh shall be entitled to seek injunctive relief in 
                    addition to any other remedies available at law.
                  </Text>
                </VStack>
              </Box>

              <Divider borderColor="whiteAlpha.200" />

              {/* Signature Section */}
              <VStack align="stretch" spacing={4}>
                <Heading size="sm" color="white">
                  Digital Signature
                </Heading>
                
                <FormControl isInvalid={!!nameError}>
                  <FormLabel color="gray.300" fontSize="sm">
                    Full Legal Name
                  </FormLabel>
                  <Input
                    value={signerName}
                    onChange={(e) => {
                      setSignerName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    placeholder="Enter your full legal name"
                    bg="blackAlpha.400"
                    border="1px solid"
                    borderColor="whiteAlpha.200"
                    color="white"
                    _placeholder={{ color: 'gray.500' }}
                    _hover={{ borderColor: 'whiteAlpha.400' }}
                    _focus={{ borderColor: 'cyan.400', boxShadow: '0 0 0 1px cyan' }}
                    size="lg"
                    fontFamily="'Caveat', cursive, system-ui"
                    fontSize="xl"
                  />
                  <FormErrorMessage>{nameError}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!termsError}>
                  <Checkbox
                    isChecked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (termsError) setTermsError('');
                    }}
                    colorScheme="cyan"
                    size="lg"
                  >
                    <Text color="gray.300" fontSize="sm">
                      I have read, understood, and agree to the terms of this Non-Disclosure 
                      Agreement. I acknowledge that this constitutes my legal electronic signature.
                    </Text>
                  </Checkbox>
                  {termsError && (
                    <Text color="red.400" fontSize="xs" mt={2}>
                      {termsError}
                    </Text>
                  )}
                </FormControl>

                {/* User Info */}
                {userEmail && (
                  <HStack spacing={2} pt={2}>
                    <Icon as={FaLock} color="gray.500" boxSize={3} />
                    <Text color="gray.500" fontSize="xs">
                      Signing as: {userEmail}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </VStack>
          </Box>

          {/* Submit Button */}
          <Button
            onClick={handleSignNDA}
            isLoading={isSubmitting}
            loadingText="Signing NDA..."
            size="lg"
            width="full"
            bgGradient="linear(to-r, cyan.500, blue.600)"
            color="white"
            _hover={{
              bgGradient: 'linear(to-r, cyan.400, blue.500)',
              transform: 'translateY(-2px)',
              boxShadow: '0 10px 40px rgba(0, 200, 255, 0.3)',
            }}
            _active={{
              transform: 'translateY(0)',
            }}
            leftIcon={<FaCheckCircle />}
            isDisabled={!agreedToTerms || !signerName.trim() || isSubmitting}
          >
            Sign & Continue
          </Button>

          {/* Footer Note */}
          <Text color="gray.500" fontSize="xs" textAlign="center" mt={6}>
            By signing, you agree that your digital signature has the same legal validity 
            as a handwritten signature under applicable electronic signature laws.
          </Text>
        </MotionBox>
      </Container>
    </Box>
  );
};

export default SignNDAPage;
