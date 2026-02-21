import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import services from "../services/services";
import HushhLogo from "../components/images/Hushhogo.png";
import config from "../resources/config/config";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } },
};

export default function Signup() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Stable redirect path — computed once from URL params
  const redirectPath = React.useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("redirect") || "/hushh-user-profile";
  }, []);

  useEffect(() => {
    if (!config.supabaseClient) {
      setIsLoading(false);
      return;
    }

    // Single listener handles both initial session check and future auth changes.
    // This avoids the race condition of calling getSession() + onAuthStateChange() separately.
    const {
      data: { subscription },
    } = config.supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate(redirectPath, { replace: true });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, [navigate, redirectPath]);

  // Prevent double-clicks on OAuth buttons
  const handleAppleSignIn = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await services.authentication.appleSignIn();
    } catch {
      setIsSigningIn(false);
    }
  }, [isSigningIn]);

  const handleGoogleSignIn = useCallback(async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await services.authentication.googleSignIn();
    } catch {
      setIsSigningIn(false);
    }
  }, [isSigningIn]);

  // Don't flash Signup UI while checking auth
  if (isLoading) return null;

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center justify-between px-6 py-6 sm:py-8"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif' }}
    >
      <motion.div
        className="w-full max-w-[448px] flex-1 flex flex-col"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="w-full max-w-[384px] mx-auto pt-3 sm:pt-5">
          {/* Logo */}
          <div className="w-full flex justify-center">
            <Link to="/">
              <div className="w-20 h-20 rounded-[22%] flex items-center justify-center overflow-hidden bg-[#131811] shadow-sm">
                <img src={HushhLogo} alt="Hushh Logo" className="w-full h-full object-cover" />
              </div>
            </Link>
          </div>

          {/* Header */}
          <div className="mt-10 text-center">
            <h1 className="text-[34px] font-bold leading-[1.12] tracking-[-0.02em] text-[#1a1a1a]">
              Create your account.
            </h1>
            <p className="mt-2 text-[16px] leading-[22px] font-normal text-[#8e8e93]">
              AI-powered investment insights and long-term wealth.
            </p>
          </div>

          {/* Sign-up Buttons */}
          <div className="mt-10 flex flex-col gap-3">
            <button
              type="button"
              disabled={isSigningIn}
              className="bg-[#1a1a1a] text-white rounded-xl h-[50px] w-full flex items-center justify-center gap-3 px-5 transition-colors duration-200 hover:bg-black active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAppleSignIn}
              aria-label="Continue with Apple"
              tabIndex={0}
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <span className="text-[16px] font-semibold leading-6">Continue with Apple</span>
            </button>

            <button
              type="button"
              disabled={isSigningIn}
              className="bg-[#f5f5f7] border border-[#e5e5ea] text-[#1a1a1a] rounded-xl h-[50px] w-full flex items-center justify-center gap-3 px-5 transition-colors duration-200 hover:bg-[#eeeeef] active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGoogleSignIn}
              aria-label="Continue with Google"
              tabIndex={0}
            >
              <svg className="w-[20px] h-[20px]" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-[16px] font-semibold leading-6">Continue with Google</span>
            </button>
          </div>

          {/* Log in link */}
          <div className="mt-8 text-center">
            <p className="text-[15px] font-normal text-[#8e8e93]">
              Already have an account?{" "}
              <Link to="/login" className="text-[#007aff] font-semibold hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Footer — Terms & Privacy */}
      <motion.div
        className="w-full max-w-[320px] pb-1 sm:pb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.3 }}
      >
        <p className="text-[12px] leading-[18px] font-normal text-[#aeaeb2] text-center">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="text-[#007aff] underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-[#007aff] underline">
            Privacy Policy
          </Link>
          .
        </p>
      </motion.div>
    </div>
  );
}
