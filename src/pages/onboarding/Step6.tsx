import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { useFooterVisibility } from '../../utils/useFooterVisibility';

// Edge Function URL for GPS geocoding (real-time location detection)
const LOCATION_GEOCODE_API = `${config.SUPABASE_URL}/functions/v1/hushh-location-geocode`;

// Back arrow icon
const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

// Chevron down icon for select
const ChevronDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Country codes with flags (sorted by most common)
const countryCodes = [
  { code: '+1', country: 'USA', flag: 'ðŸ‡ºðŸ‡¸' },
  { code: '+91', country: 'India', flag: 'ðŸ‡®ðŸ‡³' },
  { code: '+44', country: 'UK', flag: 'ðŸ‡¬ðŸ‡§' },
  { code: '+86', country: 'China', flag: 'ðŸ‡¨ðŸ‡³' },
  { code: '+81', country: 'Japan', flag: 'ðŸ‡¯ðŸ‡µ' },
  { code: '+49', country: 'Germany', flag: 'ðŸ‡©ðŸ‡ª' },
  { code: '+33', country: 'France', flag: 'ðŸ‡«ðŸ‡·' },
  { code: '+61', country: 'Australia', flag: 'ðŸ‡¦ðŸ‡º' },
  { code: '+65', country: 'Singapore', flag: 'ðŸ‡¸ðŸ‡¬' },
  { code: '+971', country: 'UAE', flag: 'ðŸ‡¦ðŸ‡ª' },
  { code: '+966', country: 'Saudi Arabia', flag: 'ðŸ‡¸ðŸ‡¦' },
  { code: '+82', country: 'South Korea', flag: 'ðŸ‡°ðŸ‡·' },
  { code: '+55', country: 'Brazil', flag: 'ðŸ‡§ðŸ‡·' },
  { code: '+52', country: 'Mexico', flag: 'ðŸ‡²ðŸ‡½' },
  { code: '+39', country: 'Italy', flag: 'ðŸ‡®ðŸ‡¹' },
  { code: '+34', country: 'Spain', flag: 'ðŸ‡ªðŸ‡¸' },
  { code: '+31', country: 'Netherlands', flag: 'ðŸ‡³ðŸ‡±' },
  { code: '+7', country: 'Russia', flag: 'ðŸ‡·ðŸ‡º' },
  { code: '+62', country: 'Indonesia', flag: 'ðŸ‡®ðŸ‡©' },
  { code: '+60', country: 'Malaysia', flag: 'ðŸ‡²ðŸ‡¾' },
  { code: '+66', country: 'Thailand', flag: 'ðŸ‡¹ðŸ‡­' },
  { code: '+63', country: 'Philippines', flag: 'ðŸ‡µðŸ‡­' },
  { code: '+92', country: 'Pakistan', flag: 'ðŸ‡µðŸ‡°' },
  { code: '+880', country: 'Bangladesh', flag: 'ðŸ‡§ðŸ‡©' },
  { code: '+27', country: 'South Africa', flag: 'ðŸ‡¿ðŸ‡¦' },
  { code: '+234', country: 'Nigeria', flag: 'ðŸ‡³ðŸ‡¬' },
  { code: '+20', country: 'Egypt', flag: 'ðŸ‡ªðŸ‡¬' },
  { code: '+90', country: 'Turkey', flag: 'ðŸ‡¹ðŸ‡·' },
  { code: '+48', country: 'Poland', flag: 'ðŸ‡µðŸ‡±' },
  { code: '+46', country: 'Sweden', flag: 'ðŸ‡¸ðŸ‡ª' },
  { code: '+47', country: 'Norway', flag: 'ðŸ‡³ðŸ‡´' },
  { code: '+45', country: 'Denmark', flag: 'ðŸ‡©ðŸ‡°' },
  { code: '+358', country: 'Finland', flag: 'ðŸ‡«ðŸ‡®' },
  { code: '+41', country: 'Switzerland', flag: 'ðŸ‡¨ðŸ‡­' },
  { code: '+43', country: 'Austria', flag: 'ðŸ‡¦ðŸ‡¹' },
  { code: '+32', country: 'Belgium', flag: 'ðŸ‡§ðŸ‡ª' },
  { code: '+351', country: 'Portugal', flag: 'ðŸ‡µðŸ‡¹' },
  { code: '+30', country: 'Greece', flag: 'ðŸ‡¬ðŸ‡·' },
  { code: '+353', country: 'Ireland', flag: 'ðŸ‡®ðŸ‡ª' },
  { code: '+972', country: 'Israel', flag: 'ðŸ‡®ðŸ‡±' },
  { code: '+54', country: 'Argentina', flag: 'ðŸ‡¦ðŸ‡·' },
  { code: '+56', country: 'Chile', flag: 'ðŸ‡¨ðŸ‡±' },
  { code: '+57', country: 'Colombia', flag: 'ðŸ‡¨ðŸ‡´' },
  { code: '+51', country: 'Peru', flag: 'ðŸ‡µðŸ‡ª' },
  { code: '+58', country: 'Venezuela', flag: 'ðŸ‡»ðŸ‡ª' },
  { code: '+64', country: 'New Zealand', flag: 'ðŸ‡³ðŸ‡¿' },
  { code: '+852', country: 'Hong Kong', flag: 'ðŸ‡­ðŸ‡°' },
  { code: '+84', country: 'Vietnam', flag: 'ðŸ‡»ðŸ‡³' },
];

export default function OnboardingStep6() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const isFooterVisible = useFooterVisibility();
  const locationAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    // Scroll to top on component mount
    window.scrollTo(0, 0);
  }, []);

  // Real-time GPS detection function
  const detectLocationRealTime = async (uid: string) => {
    if (!navigator.geolocation) {
      console.log('[Step8] Geolocation not available');
      return;
    }

    setIsDetectingLocation(true);
    setLocationMessage('Detecting location...');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000, // 1 minute cache - fresher than Step 6
        });
      });

      const { latitude, longitude } = position.coords;
      console.log(`[Step8] Real-time GPS: ${latitude}, ${longitude}`);

      locationAbortController.current = new AbortController();

      const response = await fetch(LOCATION_GEOCODE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ latitude, longitude }),
        signal: locationAbortController.current.signal,
      });

      const result = await response.json();

      if (result.success && result.data?.phoneDialCode) {
        const dialCode = result.data.phoneDialCode;
        const dialCodeExists = countryCodes.some(c => c.code === dialCode);
        
        if (dialCodeExists) {
          setCountryCode(dialCode);
          setLocationMessage(`ðŸ“ ${result.data.city || result.data.country}`);
          console.log('[Step8] Real-time GPS dial code:', dialCode);

          // Update cache for other steps
          if (config.supabaseClient) {
            await config.supabaseClient
              .from('onboarding_data')
              .update({
                gps_detected_phone_dial_code: dialCode,
                gps_location_data: result.data,
                gps_detected_country: result.data.country,
                gps_detected_state: result.data.state,
                gps_detected_city: result.data.city,
                gps_detected_postal_code: result.data.postalCode,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', uid);
          }
        }
        
        setTimeout(() => setLocationMessage(null), 2000);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.log('[Step8] GPS detection failed:', error);
      }
      setLocationMessage(null);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  useEffect(() => {
    const getCurrentUser = async () => {
      if (!config.supabaseClient) return;
      
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUserId(user.id);

      // Load existing data
      const { data: onboardingData } = await config.supabaseClient
        .from('onboarding_data')
        .select('phone_number, phone_country_code, gps_detected_phone_dial_code')
        .eq('user_id', user.id)
        .single();

      // If user has already saved a phone number, use their saved data
      if (onboardingData?.phone_number) {
        setPhoneNumber(onboardingData.phone_number);
        if (onboardingData?.phone_country_code) {
          setCountryCode(onboardingData.phone_country_code);
          console.log('[Step8] Using saved phone country code:', onboardingData.phone_country_code);
          return;
        }
      }
      
      // For new users: Always detect GPS in real-time (don't rely on stale cache)
      console.log('[Step8] Detecting location in real-time...');
      detectLocationRealTime(user.id);
    };

    getCurrentUser();
    
    return () => {
      if (locationAbortController.current) {
        locationAbortController.current.abort();
      }
    };
  }, [navigate]);

  const handleContinue = async () => {
    if (!phoneNumber || !userId || !config.supabaseClient) return;

    setIsLoading(true);
    try {
      await config.supabaseClient
        .from('onboarding_data')
        .update({
          phone_number: phoneNumber,
          phone_country_code: countryCode,
          current_step: 6,
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
    navigate('/onboarding/step-5');
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 10) {
      setPhoneNumber(value);
    }
  };

  const isValidPhone = phoneNumber.length >= 10;

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
              Enter your phone number
            </h1>
            <p className="text-slate-500 text-[14px] font-normal leading-relaxed">
              We'll send a confirmation code to verify your identity.
            </p>
          </div>

          {/* Phone Input Form */}
          <div className="flex flex-col gap-4">
            {/* Phone Input Group */}
            <div className="flex w-full items-center gap-3">
              {/* Country Code Selector */}
              <div className="relative h-14 w-[110px] flex-shrink-0">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-full w-full appearance-none rounded-full border border-gray-200 bg-white pl-4 pr-8 text-base font-bold text-slate-900 focus:border-[#2b8cee] focus:outline-none focus:ring-1 focus:ring-[#2b8cee] cursor-pointer"
                >
                  {countryCodes.map((country) => (
                    <option key={`${country.country}-${country.code}`} value={country.code}>
                      {country.flag} {country.code}
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

            {/* Helper Text */}
            <p className="px-2 text-xs font-medium text-slate-400">
              Standard message and data rates may apply.
            </p>
          </div>
        </main>

        {/* Fixed Footer - Hidden when main footer is visible */}
        {!isFooterVisible && (
          <div className="fixed bottom-0 left-0 right-0 z-20 w-full max-w-[500px] mx-auto bg-white/80 backdrop-blur-md border-t border-slate-100 p-4 flex flex-col gap-3" data-onboarding-footer>
            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!isValidPhone || isLoading}
              className={`
                flex w-full cursor-pointer items-center justify-center rounded-full h-14 px-5 text-base font-bold tracking-wide transition-all active:scale-[0.98]
                ${isValidPhone && !isLoading
                  ? 'bg-[#2b8cee] hover:bg-[#2070c0] text-white shadow-md shadow-[#2b8cee]/20'
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
