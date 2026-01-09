import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import config from '../resources/config/config';
import authentication from '../services/authentication/authentication';
import MFAVerificationModal from './auth/MFAVerificationModal';
import { useDisclosure, Box, Text, VStack } from '@chakra-ui/react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // MFA State
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string>('');
  const { isOpen: isMfaOpen, onOpen: onMfaOpen, onClose: onMfaClose } = useDisclosure();

  const checkAuthAndOnboarding = async () => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      if (!config.supabaseClient) {
        console.error("Supabase client is not initialized");
        navigate("/login", { replace: true });
        return;
      }

      const supabase = config.supabaseClient;

      // 1. Session Check
      let { data: { session } } = await supabase.auth.getSession();

      // Wait for session logic (same as before)
      if (!session?.user) {
        await new Promise<void>((resolve) => {
          const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
            if (newSession?.user) { session = newSession; resolve(); }
          });
          subscription = data.subscription;
          timeout = setTimeout(() => resolve(), 1500);
        });
        if (timeout) clearTimeout(timeout);
        if (subscription) subscription.unsubscribe();

        if (!session?.user) {
          navigate("/login", { replace: true });
          return;
        }
      }

      const user = session?.user;
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      // 2. Onboarding Check
      const { data: onboardingData } = await supabase
        .from('onboarding_data')
        .select('is_completed, current_step')
        .eq('user_id', user.id)
        .maybeSingle();

      const isOnOnboardingPage = location.pathname.startsWith('/onboarding/');

      if (!onboardingData || !onboardingData.is_completed) {
        if (!isOnOnboardingPage) {
          navigate('/onboarding/step-1', { replace: true });
          return;
        }
      }

      // 3. Global MFA Check
      // Only enforce if NOT on onboarding (to avoid locking users out during setup)
      // AND not already authorized
      if (onboardingData?.is_completed) {
        console.log('[ProtectedRoute] Checking MFA status...');
        const mfaEnrolled = await authentication.mfa.hasMFAEnrolled();
        console.log('[ProtectedRoute] MFA Enrolled:', mfaEnrolled);

        if (mfaEnrolled) {
          const assurance = await authentication.mfa.getAssuranceLevel();
          console.log('[ProtectedRoute] Assurance Level:', assurance.data);

          // If current level is AAL1 (password only) but AAL2 is possible/required
          if (assurance.data?.currentLevel === 'aal1') {
            const { data: factors } = await authentication.mfa.getVerifiedMFAFactors();
            console.log('[ProtectedRoute] MFA Factors:', factors);

            if (factors && factors.length > 0) {
              console.info('[ProtectedRoute] MFA Required - AAL1 session found for 2FA user');
              setMfaFactorId(factors[0].id);
              setIsMfaRequired(true);
              onMfaOpen();
              setIsLoading(false); // Stop loading spinner to show modal
              return; // Stop here, wait for modal
            } else {
              console.warn('[ProtectedRoute] MFA is enrolled but no verified factors returned?');
            }
          } else {
            console.log('[ProtectedRoute] Already at AAL2 or higher');
          }
        } else {
          console.log('[ProtectedRoute] User is NOT enrolled in MFA');
        }
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error("Error checking auth:", error);
      navigate("/login", { replace: true });
    } finally {
      if (!isMfaRequired) setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndOnboarding();
  }, [navigate, location.pathname]);

  const handleMfaSuccess = () => {
    setIsMfaRequired(false);
    setIsAuthorized(true);
    onMfaClose();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If MFA Is Required, Show Modal AND Block Content
  if (isMfaRequired) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Text fontSize="lg" fontWeight="bold">Security Check Required</Text>
          <Text color="gray.600">Please complete the 2FA verification to continue.</Text>
        </VStack>
        <MFAVerificationModal
          isOpen={isMfaOpen}
          onClose={() => {
            // If closed without verifying, redirect to login
            onMfaClose();
            navigate('/login');
          }}
          factorId={mfaFactorId}
          onSuccess={handleMfaSuccess}
        />
      </Box>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
