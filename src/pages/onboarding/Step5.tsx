import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import type { AccountStructure } from '../../types/onboarding';
import { useFooterVisibility } from '../../utils/useFooterVisibility';
import { locationService } from '../../services/location';

// Back arrow icon
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

// Chevron down icon for select
const ChevronDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const PHONE_DIAL_CODES = [
  { code: '+1', label: 'United States (+1)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+82', label: 'South Korea (+82)' },
  { code: '+55', label: 'Brazil (+55)' },
  { code: '+52', label: 'Mexico (+52)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+7', label: 'Russia (+7)' },
  { code: '+62', label: 'Indonesia (+62)' },
  { code: '+60', label: 'Malaysia (+60)' },
  { code: '+66', label: 'Thailand (+66)' },
  { code: '+63', label: 'Philippines (+63)' },
  { code: '+92', label: 'Pakistan (+92)' },
  { code: '+880', label: 'Bangladesh (+880)' },
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+20', label: 'Egypt (+20)' },
  { code: '+90', label: 'Turkey (+90)' },
];

export default function OnboardingStep5() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<AccountStructure | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [isAutoDetectingDialCode, setIsAutoDetectingDialCode] = useState(false);
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
        // Select * to remain compatible across schema revisions (gps_location_data columns may not exist).
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (onboardingData?.account_structure) {
        setSelectedStructure(onboardingData.account_structure as AccountStructure);
      }

      if (onboardingData?.phone_number) {
        setPhoneNumber(String(onboardingData.phone_number).replace(/\D/g, ''));
      }

      const savedPhoneCode = onboardingData?.phone_country_code ? String(onboardingData.phone_country_code) : '';
      const cachedDial =
        savedPhoneCode ||
        (onboardingData?.gps_detected_phone_dial_code ? String(onboardingData.gps_detected_phone_dial_code) : '') ||
        ((onboardingData?.gps_location_data as any)?.phoneDialCode ? String((onboardingData.gps_location_data as any).phoneDialCode) : '');

      if (cachedDial) {
        setCountryCode(cachedDial);
      } else {
        // No cached dial code yet: use IP location (no permission prompt) and cache it for later steps.
        setIsAutoDetectingDialCode(true);
        try {
          const ipLoc = await locationService.getLocationByIp();
          if (ipLoc?.phoneDialCode) {
            setCountryCode(ipLoc.phoneDialCode);
          }
          if (!onboardingData?.gps_location_data) {
            try {
              await locationService.saveLocationToOnboarding(user.id, ipLoc);
            } catch (saveErr) {
              console.warn('[Step5] Failed to cache IP location:', saveErr);
            }
          }
        } catch (err) {
          console.warn('[Step5] IP dial code detection failed:', err);
        } finally {
          setIsAutoDetectingDialCode(false);
        }
      }
    };

    getCurrentUser();
  }, [navigate]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    return digits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 15) {
      setPhoneNumber(value);
    }
  };

  const isValidPhone = phoneNumber.length >= 8 && phoneNumber.length <= 15;
  const canContinue = Boolean(selectedStructure) && isValidPhone;

  const dialCodeOptions = useMemo(() => {
    if (countryCode && !PHONE_DIAL_CODES.some((c) => c.code === countryCode)) {
      return [{ code: countryCode, label: `Custom (${countryCode})` }, ...PHONE_DIAL_CODES];
    }
    return PHONE_DIAL_CODES;
  }, [countryCode]);

  const handleContinue = async () => {
    if (!selectedStructure || !userId || !config.supabaseClient || !isValidPhone) return;

    setIsLoading(true);
    try {
      await config.supabaseClient
        .from('onboarding_data')
        .update({
          account_structure: selectedStructure,
          phone_number: phoneNumber,
          phone_country_code: countryCode,
          current_step: 5,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      navigate('/onboarding/step-7');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/step-4');
  };

  return (
    <div 
      className="bg-slate-50 min-h-screen"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <div className="onboarding-shell relative flex min-h-screen w-full flex-col bg-white max-w-[500px] mx-auto shadow-xl overflow-hidden border-x border-slate-100">
        
        {/* Sticky Header */}
        <header className="flex items-center px-4 pt-4 pb-2 bg-white sticky top-0 z-10">
          <button 
            onClick={handleBack}
            aria-label="Go back"
            className="flex size-10 shrink-0 items-center justify-center text-slate-900 rounded-full hover:bg-slate-50 transition-colors"
          >
            <BackIcon />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col px-4 sm:px-6 pb-40 sm:pb-44">
          {/* Header Section */}
          <div className="mb-8 text-center">
            <h1 className="text-slate-900 text-[22px] font-bold leading-tight tracking-tight">
              A few more details
            </h1>
            <p className="text-slate-500 text-[14px] font-normal leading-relaxed mt-2">
              This helps us personalize your account and keep your profile secure.
            </p>
          </div>

          {/* Account Options Card */}
          <h2 className="text-slate-900 text-base font-bold mb-3">Account type</h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Individual Account Option */}
            <button
              onClick={() => setSelectedStructure('individual')}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors border-b border-gray-100"
            >
              <span className="text-slate-900 text-base font-medium">Individual account</span>
              <div 
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedStructure === 'individual'
                    ? 'border-[#2b8cee] bg-[#2b8cee]'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selectedStructure === 'individual' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                )}
              </div>
            </button>

            {/* Other Account Type Option */}
            <button
              onClick={() => setSelectedStructure('other')}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
            >
              <span className="text-slate-900 text-base font-medium">Other account type</span>
              <div 
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedStructure === 'other'
                    ? 'border-[#2b8cee] bg-[#2b8cee]'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selectedStructure === 'other' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                )}
              </div>
            </button>
          </div>

          {/* Phone Number */}
          <div className="mt-8">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="text-slate-900 text-base font-bold">Phone number</h2>
              {isAutoDetectingDialCode && (
                <span className="text-xs font-semibold text-slate-400">Detecting code...</span>
              )}
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              We'll use this to verify your identity when needed.
            </p>

            <div className="flex w-full items-center gap-3">
              {/* Country Code Selector */}
              <div className="relative h-14 w-[150px] flex-shrink-0">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-full w-full appearance-none rounded-full border border-gray-200 bg-white pl-4 pr-8 text-sm font-semibold text-slate-900 focus:border-[#2b8cee] focus:outline-none focus:ring-1 focus:ring-[#2b8cee] cursor-pointer"
                >
                  {dialCodeOptions.map((country) => (
                    <option key={`${country.label}-${country.code}`} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                  <ChevronDownIcon />
                </div>
              </div>

              {/* Phone Number Input */}
              <div className="relative h-14 flex-1">
                <input
                  type="tel"
                  value={formatPhoneNumber(phoneNumber)}
                  onChange={handlePhoneChange}
                  placeholder="(555) 000-0000"
                  className="h-full w-full rounded-full border border-gray-200 bg-white px-5 text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:border-[#2b8cee] focus:outline-none focus:ring-1 focus:ring-[#2b8cee] transition-all"
                />
              </div>
            </div>

            <p className="px-2 text-xs font-medium text-slate-400 mt-2">
              Standard message and data rates may apply.
            </p>
          </div>
        </main>

        {/* Fixed Footer - Hidden when main footer is visible */}
        {!isFooterVisible && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-[500px] mx-auto border-t border-slate-100 bg-white/90 backdrop-blur-md px-4 sm:px-6 pt-4 sm:pt-5 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
            data-onboarding-footer
          >
            {/* Buttons */}
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Continue Button */}
              <button
                onClick={handleContinue}
                disabled={!canContinue || isLoading}
                data-onboarding-cta
                className={`flex w-full h-11 sm:h-12 cursor-pointer items-center justify-center rounded-full px-6 text-sm sm:text-base font-semibold transition-all active:scale-[0.98] ${
                  canContinue && !isLoading
                    ? 'bg-[#2b8cee] text-white hover:bg-[#2070c0] shadow-md shadow-[#2b8cee]/20'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? 'Saving...' : 'Continue'}
              </button>

              {/* Back Button */}
              <button
                onClick={handleBack}
                className="flex w-full cursor-pointer items-center justify-center rounded-full bg-transparent py-2 text-slate-500 text-sm font-semibold hover:text-slate-800 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
