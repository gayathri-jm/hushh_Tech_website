/**
 * GlobalNDAGate Component
 * 
 * Wrapper component that enforces NDA signing for authenticated users.
 * - Checks if user is authenticated
 * - If authenticated, verifies NDA status
 * - Redirects to /sign-nda if NDA not signed
 * - Renders children if NDA is signed or user is not authenticated
 */

import React, { useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { Box, Spinner, VStack, Text } from '@chakra-ui/react';
import { checkNDAStatus } from '../services/nda/ndaService';

interface GlobalNDAGateProps {
  children: ReactNode;
  session: Session | null;
}

// Routes that don't require NDA check (public routes)
const PUBLIC_ROUTES = [
  '/',
  '/Login',
  '/Signup',
  '/auth/callback',
  '/privacy-policy',
  '/faq',
  '/carrer-privacy-policy',
  '/california-privacy-policy',
  '/eu-uk-jobs-privacy-policy',
  '/delete-account',
  '/investor-guide',
  '/hushhid',
  '/investor',
  '/sign-nda',
  '/hushh-ai',
  '/hushh-agent',
  '/kai',
  '/kai-india',
  '/studio',
];

// Check if a path matches any public route pattern
const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_ROUTES.some(route => {
    // Exact match for home route
    if (route === '/') {
      return pathname === '/';
    }
    // For other routes, check exact match or sub-routes
    return pathname === route || pathname.startsWith(`${route}/`);
  });
};

const GlobalNDAGate: React.FC<GlobalNDAGateProps> = ({ children, session }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [hasSignedNDA, setHasSignedNDA] = useState<boolean | null>(null);

  useEffect(() => {
    const checkNDA = async () => {
      // Skip check for public routes
      if (isPublicRoute(location.pathname)) {
        setIsChecking(false);
        setHasSignedNDA(true); // Allow access to public routes
        return;
      }

      // If no session, allow access (they'll hit login page if needed)
      if (!session?.user?.id) {
        setIsChecking(false);
        setHasSignedNDA(true);
        return;
      }

      try {
        const status = await checkNDAStatus(session.user.id);
        setHasSignedNDA(status.hasSignedNda);
        
        // Redirect to NDA page if not signed
        if (!status.hasSignedNda) {
          // Store the intended destination
          sessionStorage.setItem('nda_redirect_after', location.pathname);
          navigate('/sign-nda', { replace: true });
        }
      } catch (error) {
        console.error('Error checking NDA status:', error);
        // On error, allow access but log the issue
        setHasSignedNDA(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkNDA();
  }, [session, location.pathname, navigate]);

  // Re-check when session changes
  useEffect(() => {
    if (session?.user?.id) {
      setIsChecking(true);
    }
  }, [session?.user?.id]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <Box
        minH="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%)"
      >
        <VStack spacing={4}>
          <Spinner
            thickness="4px"
            speed="0.65s"
            emptyColor="gray.700"
            color="cyan.400"
            size="xl"
          />
          <Text color="gray.400" fontSize="sm">
            Verifying access...
          </Text>
        </VStack>
      </Box>
    );
  }

  // Render children if NDA is signed or access is allowed
  return <>{children}</>;
};

export default GlobalNDAGate;
