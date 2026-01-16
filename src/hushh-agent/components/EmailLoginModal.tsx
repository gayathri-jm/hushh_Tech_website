/**
 * Email Login Modal Component for Hushh Agent
 * 
 * Beautiful modal for email OTP authentication
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Icon,
  Box,
  PinInput,
  PinInputField,
  useToast,
  Spinner,
  Heading,
  Divider,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiArrowLeft, FiCheck, FiLock, FiShield } from 'react-icons/fi';

const MotionBox = motion(Box);

interface EmailLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  // Auth functions passed from parent (App.tsx) to share state
  sendOTP: (email: string) => Promise<boolean>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  isSendingOTP: boolean;
  isVerifying: boolean;
  error: string | null;
  otpSent: boolean;
  clearError: () => void;
}

export const EmailLoginModal: React.FC<EmailLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  // Use auth functions from props (shared state with App.tsx)
  sendOTP,
  verifyOTP,
  isSendingOTP,
  isVerifying,
  error,
  otpSent,
  clearError,
}) => {
  const toast = useToast();

  // Local state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setOtp('');
      setStep('email');
      clearError();
    }
  }, [isOpen, clearError]);

  // Focus email input when modal opens
  useEffect(() => {
    if (isOpen && step === 'email') {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isOpen, step]);

  // Auto-advance when OTP is sent
  useEffect(() => {
    if (otpSent && step === 'email') {
      setStep('otp');
    }
  }, [otpSent, step]);

  // Handle send OTP
  const handleSendOTP = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    const success = await sendOTP(email);
    if (success) {
      toast({
        title: 'OTP Sent! 📧',
        description: `Check your inbox at ${email}`,
        status: 'success',
        duration: 4000,
      });
    }
  };

  // Handle verify OTP
  const handleVerifyOTP = async (otpValue: string) => {
    if (otpValue.length !== 6) return;

    const success = await verifyOTP(email, otpValue);
    if (success) {
      // Show success screen briefly, then force page reload
      // This is the nuclear fix for React state sync issues
      setStep('success');
    }
  };

  // Handle success screen - force page reload to ensure proper state sync
  // React's state batching was causing the modal to stay stuck
  useEffect(() => {
    if (step === 'success') {
      console.log('[EmailLoginModal] Success! Reloading page to ensure proper state sync...');
      
      // Show success animation briefly, then reload
      const timer = setTimeout(() => {
        window.location.reload();
      }, 1200);
      
      return () => clearTimeout(timer);
    }
  }, [step]);

  // Handle OTP change
  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      handleVerifyOTP(value);
    }
  };

  // Go back to email step
  const handleBack = () => {
    setStep('email');
    setOtp('');
    clearError();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      size="md"
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(10px)" />
      <ModalContent
        bg="linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)"
        borderRadius="24px"
        border="1px solid"
        borderColor="whiteAlpha.200"
        overflow="hidden"
        mx={4}
      >
        <ModalCloseButton color="white" zIndex={10} />
        
        <ModalBody py={8} px={6}>
          <AnimatePresence mode="wait">
            {step === 'success' ? (
              /* Success Screen */
              <MotionBox
                key="success-step"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <VStack spacing={6} align="center" py={8}>
                  {/* Animated Checkmark Circle */}
                  <MotionBox
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 200, 
                      damping: 15,
                      delay: 0.1
                    }}
                  >
                    <Box
                      bg="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      p={6}
                      borderRadius="full"
                      boxShadow="0 0 60px rgba(56, 239, 125, 0.4)"
                      position="relative"
                    >
                      {/* Pulse Ring Animation */}
                      <Box
                        position="absolute"
                        top="-4px"
                        left="-4px"
                        right="-4px"
                        bottom="-4px"
                        borderRadius="full"
                        border="2px solid"
                        borderColor="green.400"
                        opacity={0.5}
                        animation="pulse 1.5s ease-in-out infinite"
                        sx={{
                          '@keyframes pulse': {
                            '0%': { transform: 'scale(1)', opacity: 0.5 },
                            '50%': { transform: 'scale(1.15)', opacity: 0 },
                            '100%': { transform: 'scale(1)', opacity: 0.5 },
                          },
                        }}
                      />
                      <Icon as={FiCheck} boxSize={12} color="white" strokeWidth={3} />
                    </Box>
                  </MotionBox>

                  {/* Success Text */}
                  <MotionBox
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <VStack spacing={2}>
                      <Heading size="lg" color="white" fontWeight="700">
                        Email Verified! 
                      </Heading>
                      <Text color="gray.400" fontSize="md">
                        Welcome back! 🎉
                      </Text>
                    </VStack>
                  </MotionBox>

                  {/* Loading Indicator for redirect */}
                  <MotionBox
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <VStack spacing={3}>
                      <Spinner size="sm" color="green.400" thickness="2px" />
                      <Text color="gray.500" fontSize="sm">
                        Loading your dashboard...
                      </Text>
                    </VStack>
                  </MotionBox>
                </VStack>
              </MotionBox>
            ) : step === 'email' ? (
              <MotionBox
                key="email-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <VStack spacing={6} align="stretch">
                  {/* Header */}
                  <VStack spacing={2} textAlign="center">
                    <Box
                      bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      p={4}
                      borderRadius="full"
                      mb={2}
                    >
                      <Icon as={FiMail} boxSize={8} color="white" />
                    </Box>
                    <Heading size="lg" color="white" fontWeight="600">
                      Sign In
                    </Heading>
                    <Text color="gray.400" fontSize="sm">
                      Enter your email to receive a verification code
                    </Text>
                  </VStack>

                  {/* Email Input */}
                  <Box>
                    <Text color="gray.400" fontSize="xs" mb={2} fontWeight="500">
                      EMAIL ADDRESS
                    </Text>
                    <Input
                      ref={emailInputRef}
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                      size="lg"
                      bg="whiteAlpha.100"
                      border="2px solid"
                      borderColor="whiteAlpha.200"
                      color="white"
                      _placeholder={{ color: 'gray.500' }}
                      _hover={{ borderColor: 'whiteAlpha.400' }}
                      _focus={{
                        borderColor: '#667eea',
                        boxShadow: '0 0 0 1px #667eea',
                      }}
                      borderRadius="12px"
                    />
                  </Box>

                  {/* Error Message */}
                  {error && (
                    <Text color="red.400" fontSize="sm" textAlign="center">
                      {error}
                    </Text>
                  )}

                  {/* Send OTP Button */}
                  <Button
                    size="lg"
                    bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    color="white"
                    _hover={{
                      transform: 'translateY(-2px)',
                      boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3)',
                    }}
                    _active={{ transform: 'scale(0.98)' }}
                    borderRadius="12px"
                    onClick={handleSendOTP}
                    isLoading={isSendingOTP}
                    loadingText="Sending..."
                    spinner={<Spinner size="sm" />}
                    fontWeight="600"
                    transition="all 0.2s"
                  >
                    Send Verification Code
                  </Button>

                  {/* Security Note */}
                  <HStack justify="center" spacing={2} opacity={0.6}>
                    <Icon as={FiShield} color="gray.500" boxSize={3} />
                    <Text color="gray.500" fontSize="xs">
                      Secure, passwordless authentication
                    </Text>
                  </HStack>
                </VStack>
              </MotionBox>
            ) : (
              <MotionBox
                key="otp-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <VStack spacing={6} align="stretch">
                  {/* Back Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<FiArrowLeft />}
                    color="gray.400"
                    _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                    alignSelf="flex-start"
                    onClick={handleBack}
                    isDisabled={isVerifying}
                  >
                    Back
                  </Button>

                  {/* Header */}
                  <VStack spacing={2} textAlign="center">
                    <Box
                      bg="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
                      p={4}
                      borderRadius="full"
                      mb={2}
                    >
                      <Icon as={FiLock} boxSize={8} color="white" />
                    </Box>
                    <Heading size="lg" color="white" fontWeight="600">
                      Enter Code
                    </Heading>
                    <Text color="gray.400" fontSize="sm">
                      We sent a 6-digit code to
                    </Text>
                    <Text color="white" fontWeight="500" fontSize="sm">
                      {email}
                    </Text>
                  </VStack>

                  {/* OTP Input */}
                  <HStack justify="center" spacing={2}>
                    <PinInput
                      value={otp}
                      onChange={handleOtpChange}
                      size="lg"
                      otp
                      isDisabled={isVerifying}
                      autoFocus
                    >
                      {[...Array(6)].map((_, i) => (
                        <PinInputField
                          key={i}
                          bg="whiteAlpha.100"
                          border="2px solid"
                          borderColor="whiteAlpha.200"
                          color="white"
                          fontSize="xl"
                          fontWeight="bold"
                          _hover={{ borderColor: 'whiteAlpha.400' }}
                          _focus={{
                            borderColor: '#38ef7d',
                            boxShadow: '0 0 0 1px #38ef7d',
                          }}
                          borderRadius="12px"
                          w="48px"
                          h="56px"
                        />
                      ))}
                    </PinInput>
                  </HStack>

                  {/* Verifying State */}
                  {isVerifying && (
                    <HStack justify="center" spacing={2}>
                      <Spinner size="sm" color="green.400" />
                      <Text color="gray.400" fontSize="sm">
                        Verifying...
                      </Text>
                    </HStack>
                  )}

                  {/* Error Message */}
                  {error && (
                    <Text color="red.400" fontSize="sm" textAlign="center">
                      {error}
                    </Text>
                  )}

                  {/* Resend Link */}
                  <VStack spacing={2}>
                    <Divider borderColor="whiteAlpha.200" />
                    <HStack justify="center" spacing={1}>
                      <Text color="gray.500" fontSize="sm">
                        Didn't receive the code?
                      </Text>
                      <Button
                        variant="link"
                        color="#667eea"
                        fontSize="sm"
                        fontWeight="600"
                        onClick={handleSendOTP}
                        isDisabled={isSendingOTP}
                      >
                        Resend
                      </Button>
                    </HStack>
                  </VStack>

                  {/* Check Spam Note */}
                  <Text color="gray.600" fontSize="xs" textAlign="center">
                    Check your spam folder if you don't see it
                  </Text>
                </VStack>
              </MotionBox>
            )}
          </AnimatePresence>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default EmailLoginModal;
