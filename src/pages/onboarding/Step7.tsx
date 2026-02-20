import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { upsertOnboardingData } from '../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../utils/useFooterVisibility';
import { OnboardingStepProgress } from '../../components/onboarding/OnboardingStepProgress';

// Back arrow icon
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export default function OnboardingStep7() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFooterVisible = useFooterVisibility();

  useEffect(() => {
    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!config.supabaseClient) return;

      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Extract name from OAuth provider metadata (Google, Apple, etc.)
      const userMeta = user.user_metadata || {};
      
      // Try different name field patterns from various OAuth providers
      // Google provides: given_name, family_name, full_name, name
      // Apple provides: name (first_name, last_name), full_name
      const oauthFirstName = userMeta.given_name || 
                             userMeta.first_name || 
                             (userMeta.full_name?.split(' ')[0]) || 
                             (userMeta.name?.split(' ')[0]) || '';
      const oauthLastName = userMeta.family_name || 
                            userMeta.last_name || 
                            (userMeta.full_name?.split(' ').slice(1).join(' ')) || 
                            (userMeta.name?.split(' ').slice(1).join(' ')) || '';

      // Check if user already has saved data in onboarding_data
      const { data } = await config.supabaseClient
        .from('onboarding_data')
        .select('legal_first_name, legal_last_name')
        .eq('user_id', user.id)
        .single();

      // Priority: Database data > OAuth provider data
      // This allows users to keep their edits if they go back and forth
      setFirstName(data?.legal_first_name || oauthFirstName);
      setLastName(data?.legal_last_name || oauthLastName);
    };

    loadData();
  }, [navigate]);

  const handleContinue = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter both first and last name');
      return;
    }

    setIsLoading(true);
    setError(null);

    if (!config.supabaseClient) {
      setError('Configuration error');
      setIsLoading(false);
      return;
    }

    const { data: { user } } = await config.supabaseClient.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setIsLoading(false);
      return;
    }

    const { error: upsertError } = await upsertOnboardingData(user.id, {
      legal_first_name: firstName.trim(),
      legal_last_name: lastName.trim(),
      current_step: 7,
    });

    if (upsertError) {
      setError('Failed to save data');
      setIsLoading(false);
      return;
    }

    navigate('/onboarding/step-8');
  };

  const handleBack = () => {
    navigate('/onboarding/step-5');
  };

  const handleSkip = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (config.supabaseClient) {
        const { data: { user } } = await config.supabaseClient.auth.getUser();
        if (user) {
          await upsertOnboardingData(user.id, { current_step: 7 });
        }
      }
      navigate('/onboarding/step-8');
    } catch {
      navigate('/onboarding/step-8');
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = firstName.trim() && lastName.trim();

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <div className="onboarding-shell relative flex min-h-screen w-full flex-col bg-white max-w-[500px] mx-auto shadow-xl overflow-hidden border-x border-slate-100">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-white/90 px-4 pt-4 pb-2 backdrop-blur-sm sm:px-6 sm:pt-5">
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="flex size-10 items-center justify-center rounded-full text-slate-900 transition-colors hover:bg-slate-100"
          >
            <BackIcon />
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isLoading}
            className="text-sm font-semibold tracking-wide text-slate-500 transition-colors hover:text-[#3A63B8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            SKIP
          </button>
        </header>

        <OnboardingStepProgress currentStep={7} totalSteps={12} displayStep={6} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 pb-40 sm:px-6 sm:pb-48">
          {/* Header Section - Center Aligned */}
          <div className="mb-10 mt-2 text-center">
            <h1 className="mb-3 text-3xl font-bold text-slate-900">
              Enter your full legal name
            </h1>
            <p className="mx-auto max-w-sm text-base leading-relaxed text-slate-500">
              We are required to collect this info for verification.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <form className="space-y-8">
            {/* First Name Field */}
            <div className="space-y-2">
              <label className="block text-base font-semibold text-slate-900">
                Legal first name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="JHUMMA"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#3A63B8]"
                autoComplete="given-name"
              />
            </div>

            {/* Last Name Field */}
            <div className="space-y-2">
              <label className="block text-base font-semibold text-slate-900">
                Legal last name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="KUMARI"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-[#3A63B8]"
                autoComplete="family-name"
              />
            </div>
          </form>
        </main>

        {/* Fixed Footer - Hidden when main footer is visible */}
        {!isFooterVisible && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-[500px] mx-auto border-t border-slate-100 bg-white/90 backdrop-blur-md px-4 sm:px-6 pt-4 sm:pt-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
            data-onboarding-footer
          >
            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!isValid || isLoading}
              data-onboarding-cta
              className={`
                flex w-full cursor-pointer items-center justify-center rounded-full h-11 sm:h-12 px-6 text-sm sm:text-base font-semibold transition-all active:scale-[0.98]
                ${isValid && !isLoading
                  ? 'bg-[#3A63B8] text-white shadow-lg shadow-blue-500/20 hover:bg-[#2e4f94]'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400'
                }
              `}
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

