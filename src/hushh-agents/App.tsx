/**
 * Hushh Agents - Main App Component
 * 
 * Handles authentication and routing for the Hushh Agents module.
 * Routes:
 * - /hushh-agents           → Home (agent selection)
 * - /hushh-agents/chat/:id  → Chat with specific agent
 */

import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { FaApple } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { FiMessageSquare, FiMic, FiGlobe, FiShield, FiLock } from 'react-icons/fi';
import { useAuth } from './hooks/useAuth';
import { HUSHH_BRANDING } from './core/constants';
import HushhLogo from '../components/images/Hushhogo.png';

// Lazy load pages
const HomePage = lazy(() => import('./pages/HomePage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const VoicePage = lazy(() => import('./pages/VoicePage'));
const CodePage = lazy(() => import('./pages/CodePage'));

// Playfair heading style
const playfair = { fontFamily: "'Playfair Display', serif" };

// Loading component
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-hushh-blue to-blue-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
        <span className="text-white text-2xl font-bold">H</span>
      </div>
      <p className="text-gray-400 text-sm">Loading {HUSHH_BRANDING.FULL_NAME}...</p>
    </div>
  </div>
);

// Login Screen Component - Desktop Responsive with Professional Icons
const LoginScreen: React.FC<{
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  isSigningIn: boolean;
  error: string | null;
}> = ({ onGoogleSignIn, onAppleSignIn, isSigningIn, error }) => (
  <div className="min-h-screen bg-white text-gray-900 antialiased flex flex-col">
    {/* Desktop: Two-column layout, Mobile: Single column */}
    <div className="flex-grow flex flex-col lg:flex-row">
      
      {/* Left Panel - Branding (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-black p-12 flex-col justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden backdrop-blur-sm">
              <img src={HushhLogo} alt="Hushh" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-white text-xl font-medium" style={playfair}>Hushh</span>
          </Link>
        </div>
        
        <div className="space-y-8">
          <h1 className="text-5xl xl:text-6xl text-white font-normal leading-tight" style={playfair}>
            Your Private<br />
            <span className="text-gray-400 italic">AI Companions</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md leading-relaxed">
            Intelligent conversations in Hindi, English, and Tamil. 
            Powered by advanced AI, designed for you.
          </p>
          
          {/* Feature List - Desktop */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <FiMessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Natural Conversations</p>
                <p className="text-gray-500 text-sm">Text chat that understands context</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <FiMic className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Voice Chat <span className="text-xs text-gray-500 ml-1">Pro</span></p>
                <p className="text-gray-500 text-sm">Speak naturally with Hushh</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <FiGlobe className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Multi-lingual</p>
                <p className="text-gray-500 text-sm">English, हिंदी, தமிழ் supported</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <FiShield className="w-4 h-4" />
          <span>Your data stays private and secure</span>
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <main className="flex-grow lg:w-1/2 px-6 lg:px-12 xl:px-20 flex flex-col justify-center py-12 lg:py-0">
        <div className="max-w-md mx-auto w-full">
          {/* Logo - Mobile only */}
          <section className="flex justify-center pt-8 pb-6 lg:hidden">
            <Link to="/">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-hushh-blue to-blue-600 flex items-center justify-center overflow-hidden border border-black/5">
                <img src={HushhLogo} alt="Hushh Logo" className="w-10 h-10 object-contain" />
              </div>
            </Link>
          </section>

          {/* Title */}
          <section className="pb-8 lg:pb-10">
            <h1
              className="text-3xl lg:text-4xl leading-[1.1] font-normal text-black tracking-tight text-center lg:text-left font-serif"
              style={playfair}
            >
              {HUSHH_BRANDING.FULL_NAME}
            </h1>
            <p className="text-gray-500 text-sm lg:text-base font-light mt-3 text-center lg:text-left leading-relaxed">
              {HUSHH_BRANDING.TAGLINE}
            </p>
          </section>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-red-600 text-sm text-center lg:text-left">{error}</p>
            </div>
          )}

          {/* Sign-in Buttons */}
          <section className="space-y-3 mb-8">
            <button
              onClick={onAppleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-black text-white rounded-2xl font-medium text-sm hover:bg-gray-900 transition-colors disabled:opacity-50"
            >
              <FaApple className="text-xl" />
              <span>Continue with Apple</span>
            </button>

            <button
              onClick={onGoogleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-900 rounded-2xl font-medium text-sm border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <FcGoogle className="text-xl" />
              <span>Continue with Google</span>
            </button>
          </section>

          {/* Features Preview - Mobile only */}
          <section className="space-y-4 mb-8 lg:hidden">
            <h2 className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
              What You Get
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="flex justify-center mb-2">
                  <FiMessageSquare className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-xs text-gray-600">Text Chat</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="flex justify-center mb-2">
                  <FiMic className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-xs text-gray-600">Voice (Pro)</p>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="flex justify-center mb-2">
                  <FiGlobe className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-xs text-gray-600">Multi-lingual</p>
              </div>
            </div>
          </section>

          {/* Trust Badge */}
          <section className="flex flex-col items-center lg:items-start justify-center text-center lg:text-left gap-2 pt-4 pb-4">
            <div className="flex items-center gap-2">
              <FiLock className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400 tracking-wide uppercase font-medium">
                Private & Secure
              </span>
            </div>
          </section>

          {/* Terms Footer */}
          <p className="text-[11px] leading-[16px] text-gray-400 text-center lg:text-left font-light">
            By continuing, you agree to our{" "}
            <Link to="/terms" className="underline underline-offset-2 hover:text-gray-600">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-gray-600">
              Privacy Policy
            </Link>
          </p>
        </div>
      </main>
    </div>

    {/* Footer - Mobile only */}
    <footer className="py-4 text-center border-t border-gray-100 lg:hidden">
      <p className="text-xs text-gray-400">{HUSHH_BRANDING.POWERED_BY}</p>
    </footer>
  </div>
);

const App: React.FC = () => {
  const { isAuthenticated, isLoading, user, signIn, signOut, error } = useAuth();

  // Loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <LoginScreen
        onGoogleSignIn={() => signIn('google')}
        onAppleSignIn={() => signIn('apple')}
        isSigningIn={false}
        error={error}
      />
    );
  }

  // Authenticated - show app
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Home - Agent Selection */}
        <Route
          index
          element={<HomePage />}
        />

        {/* Voice Assistant - Tamil/Hindi/English */}
        <Route
          path="voice"
          element={<VoicePage />}
        />

        {/* Code Generation - Claude Opus 4.5 */}
        <Route
          path="code"
          element={<CodePage />}
        />

        {/* Chat with specific agent */}
        <Route
          path="chat/:agentId"
          element={<ChatPage />}
        />

        {/* Default chat (Hushh agent) */}
        <Route
          path="chat"
          element={<Navigate to="/hushh-agents/chat/hushh" replace />}
        />

        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/hushh-agents" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
