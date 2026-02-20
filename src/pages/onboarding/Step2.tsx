import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { upsertOnboardingData } from '../../services/onboarding/upsertOnboardingData';
import type { ReferralSource } from '../../types/onboarding';
import { useFooterVisibility } from '../../utils/useFooterVisibility';
import { OnboardingStepProgress } from '../../components/onboarding/OnboardingStepProgress';
import { Smartphone, Users, Mic, Newspaper, Search, Plus } from 'lucide-react';

// Back arrow icon
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

// Referral options matching the HTML template
interface ReferralOption {
  value: ReferralSource;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const referralOptions: ReferralOption[] = [
  { value: 'social_media_ad', label: 'Social Media', icon: Smartphone },
  { value: 'family_friend', label: 'Friend or Family', icon: Users },
  { value: 'podcast', label: 'Podcast', icon: Mic },
  { value: 'website_blog_article', label: 'News Article', icon: Newspaper },
  { value: 'ai_tool', label: 'Google Search', icon: Search },
  { value: 'other', label: 'Other', icon: Plus },
];

export default function OnboardingStep2() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<ReferralSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isFooterVisible = useFooterVisibility();

  useEffect(() => {
    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      if (!config.supabaseClient) return;
      
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUserId(user.id);

      // Load existing data if any
      const { data: onboardingData } = await config.supabaseClient
        .from('onboarding_data')
        .select('referral_source')
        .eq('user_id', user.id)
        .single();

      if (onboardingData?.referral_source) {
        setSelectedSource(onboardingData.referral_source as ReferralSource);
      }
    };

    getCurrentUser();
  }, [navigate]);

  const handleContinue = async () => {
    if (!userId || !config.supabaseClient || !selectedSource) return;

    setIsLoading(true);
    try {
      await upsertOnboardingData(userId, {
        referral_source: selectedSource,
        current_step: 2,
      });

      navigate('/onboarding/step-4');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (userId) {
      try {
        await upsertOnboardingData(userId, { current_step: 2 });
      } catch (error) {
        console.error('Error:', error);
      }
    }
    navigate('/onboarding/step-4');
  };

  const handleBack = () => {
    navigate('/onboarding/step-1');
  };

  return (
    <div 
      className="bg-slate-50 min-h-screen"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <div className="onboarding-shell relative flex min-h-screen w-full flex-col bg-white max-w-[500px] mx-auto shadow-xl overflow-hidden border-x border-slate-100">
        
        {/* Sticky Header */}
        <header className="flex items-center px-4 pt-4 pb-2 sm:px-6 sm:pt-5 bg-white/95 backdrop-blur-sm sticky top-0 z-10">
          <button 
            onClick={handleBack}
            aria-label="Go back"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <BackIcon />
          </button>
        </header>

        <OnboardingStepProgress currentStep={2} totalSteps={12} visibleSteps={12} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-40 sm:pb-48">
          {/* Headline */}
          <div className="flex flex-col items-center text-center mt-3 mb-6">
            <h1 className="text-slate-900 tracking-tight text-[24px] font-bold leading-tight max-w-[380px]">
              How did you hear about Hushh Fund A?
            </h1>
          </div>

          {/* Radio Options Cards */}
          <div className="flex flex-col gap-3 w-full max-w-[760px] mx-auto">
            {referralOptions.map((option) => {
              const isSelected = selectedSource === option.value;
              const Icon = option.icon;
               
              return (
                <label
                  key={option.value}
                  className={`
                    group relative flex items-center gap-3 rounded-xl border bg-white p-4 cursor-pointer transition-all duration-200 min-h-[72px]
                    ${isSelected 
                      ? 'border-[#3A63B8] bg-[#F0F4FF] shadow-[0_4px_12px_rgba(58,99,184,0.08)]' 
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                    }
                  `}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    isSelected ? 'bg-[#dfe9ff]' : 'bg-slate-100'
                  }`}>
                    <Icon className={`h-5 w-5 transition-colors ${
                      isSelected ? 'text-[#3A63B8]' : 'text-slate-400'
                    }`} />
                  </div>

                  <div className="flex grow flex-col text-left">
                    <p className={`text-base leading-normal transition-colors ${
                      isSelected ? 'font-semibold text-[#3A63B8]' : 'font-medium text-slate-900'
                    }`}>
                      {option.label}
                    </p>
                  </div>
                   
                  {/* Custom Radio Button */}
                  <input
                    type="radio"
                    name="referral-source"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setSelectedSource(option.value)}
                    className="sr-only"
                  />
                  <div 
                    className={`
                      w-5 h-5 rounded-full border-2 relative transition-all duration-200 shrink-0
                      ${isSelected 
                        ? 'border-[#3A63B8]' 
                        : 'border-slate-300'
                      }
                    `}
                  >
                    {isSelected && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#3A63B8] rounded-full" />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </main>

        {/* Fixed Footer - Hidden when main footer is visible */}
        {!isFooterVisible && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-[500px] mx-auto border-t border-slate-100 bg-white/95 backdrop-blur-md px-4 sm:px-6 pt-4 pb-[calc(env(safe-area-inset-bottom)+10px)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
            data-onboarding-footer
          >
            {/* Buttons */}
            <div className="flex flex-col gap-2">
              {/* Continue Button */}
              <button
                onClick={handleContinue}
                disabled={!selectedSource || isLoading}
                data-onboarding-cta
                className={`flex w-full h-12 cursor-pointer items-center justify-center rounded-full bg-[#3A63B8] px-6 text-white text-[17px] font-semibold transition-all hover:bg-[#2e4f94] active:scale-[0.99] disabled:bg-slate-100 disabled:text-slate-400 ${
                  !selectedSource || isLoading ? 'disabled:cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Saving...' : 'Next'}
              </button>

              {/* Skip Button */}
              <button
                onClick={handleSkip}
                className="flex w-full cursor-pointer items-center justify-center rounded-full bg-transparent py-1.5 text-slate-500 text-sm font-semibold hover:text-slate-800 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

