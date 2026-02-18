import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { upsertOnboardingData } from '../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../utils/useFooterVisibility';

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
    navigate('/onboarding/step-6');
  };

  const isValid = firstName.trim() && lastName.trim();

  return (
    <div 
      className="bg-slate-50 min-h-screen"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <div className="onboarding-shell relative flex min-h-screen w-full flex-col bg-white max-w-[500px] mx-auto shadow-xl overflow-hidden border-x border-slate-100">
        
        {/* Sticky Header */}
        <header className="flex items-center px-4 pt-6 pb-4 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
          <button 
            onClick={handleBack}
            className="flex items-center gap-1 text-slate-900 hover:text-[#2b8cee] transition-colors"
          >
            <BackIcon />
            <span className="text-base font-bold tracking-tight">Back</span>
          </button>
          <div className="flex-1" />
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col px-6 pb-48">
          {/* Header Section - Center Aligned */}
          <div className="mb-8 text-center">
            <h1 className="text-slate-900 text-[22px] font-bold leading-tight tracking-tight mb-3">
              Enter your full legal name
            </h1>
            <p className="text-slate-500 text-[14px] font-normal leading-relaxed">
              We are required to collect this info for verification.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <div className="flex flex-col gap-6 w-full">
            {/* First Name Field */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-900 text-base font-medium leading-normal pl-1">
                Legal first name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Jane"
                className="w-full h-14 px-5 rounded-full border border-gray-200 bg-white text-slate-900 placeholder:text-slate-400 text-base font-normal focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/20 focus:border-[#2b8cee] transition-all"
              />
            </div>

            {/* Last Name Field */}
            <div className="flex flex-col gap-2">
              <label className="text-slate-900 text-base font-medium leading-normal pl-1">
                Legal last name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                className="w-full h-14 px-5 rounded-full border border-gray-200 bg-white text-slate-900 placeholder:text-slate-400 text-base font-normal focus:outline-none focus:ring-2 focus:ring-[#2b8cee]/20 focus:border-[#2b8cee] transition-all"
              />
            </div>
          </div>
        </main>

        {/* Fixed Footer - Hidden when main footer is visible */}
        {!isFooterVisible && (
          <div className="fixed bottom-0 left-0 right-0 z-20 w-full max-w-[500px] mx-auto bg-white/80 backdrop-blur-md border-t border-slate-100 p-4 flex flex-col gap-3" data-onboarding-footer>
            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!isValid || isLoading}
              className={`
                flex w-full cursor-pointer items-center justify-center rounded-full h-14 px-5 text-base font-bold tracking-wide transition-all active:scale-[0.98]
                ${isValid && !isLoading
                  ? 'bg-[#2b8cee] hover:bg-[#2070c0] text-white shadow-lg shadow-[#2b8cee]/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }
              `}
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </button>
            
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex w-full cursor-pointer items-center justify-center rounded-full bg-transparent py-2 text-slate-500 text-sm font-bold hover:text-slate-800 transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
