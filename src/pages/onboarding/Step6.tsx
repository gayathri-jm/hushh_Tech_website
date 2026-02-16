import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../resources/config/config';
import { useFooterVisibility } from '../../utils/useFooterVisibility';
import { locationService, LocationData, COUNTRY_CODE_TO_NAME } from '../../services/location';

// Back arrow icon
const BackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

// Chevron down icon for select
const ChevronDownIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

// Location pin icon (professional, no emoji)
const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

// United States first, then all other countries alphabetically
const countries = [
  'United States',
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
  'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
  'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo',
  'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica',
  'Dominican Republic', 'East Timor', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
  'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia',
  'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
  'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'North Korea',
  'South Korea', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia',
  'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macedonia', 'Madagascar', 'Malawi',
  'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia',
  'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka',
  'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan',
  'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
  'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

export default function OnboardingStep6() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [citizenshipCountry, setCitizenshipCountry] = useState('');
  const [residenceCountry, setResidenceCountry] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isFooterVisible = useFooterVisibility();

  // GPS location detection state
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationDetected, setLocationDetected] = useState(false);
  const [userManuallyChanged, setUserManuallyChanged] = useState(false);
  const [detectionAttempted, setDetectionAttempted] = useState(false);

  // Continue button should only be enabled if:
  // 1. Location has been detected (GPS success), OR
  // 2. User has manually changed the dropdown, OR
  // 3. Detection was attempted but failed (user can proceed with defaults after explicit action)
  const canContinue = locationDetected || userManuallyChanged || (detectionAttempted && !isDetectingLocation);

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
        .select('citizenship_country, residence_country, gps_location_data')
        .eq('user_id', user.id)
        .single();

      if (onboardingData) {
        // If user already has data, use it (but still detect fresh GPS)
        if (onboardingData.citizenship_country) {
          setCitizenshipCountry(onboardingData.citizenship_country);
          setUserManuallyChanged(true); // User already has data, allow continue
        }
        if (onboardingData.residence_country) {
          setResidenceCountry(onboardingData.residence_country);
        }
        
        // NOTE: We no longer skip GPS detection even if cached.
        // Always detect fresh GPS location in real-time every time user visits Step 6
      }

      // ALWAYS detect GPS location in real-time (every page visit)
      detectLocation(user.id);
    };

    getCurrentUser();
    
    // Cleanup
    return () => {
      locationService.cancel();
    };
  }, [navigate]);

  // GPS location detection function using location service
  const detectLocation = async (uid: string) => {
    setIsDetectingLocation(true);
    setLocationMessage('Detecting your location...');

    try {
      const result = await locationService.detectLocation();
      setDetectionAttempted(true);

      if (result.source === 'detected' && result.data) {
        const locationData: LocationData = result.data;
        console.log('[Step6] Location detected:', locationData);

        // Map country code to full name
        const countryName = COUNTRY_CODE_TO_NAME[locationData.countryCode] || locationData.country;
        
        // Update UI with detected country
        if (countries.includes(countryName)) {
          setCitizenshipCountry(countryName);
          setResidenceCountry(countryName);
        }

        setLocationMessage(`Location detected: ${locationData.city || locationData.state || countryName}`);
        setLocationDetected(true);

        // Save GPS location data for use in Step 8 and Step 10
        await locationService.saveLocationToOnboarding(uid, locationData);

        // Clear message after 2 seconds
        setTimeout(() => {
          setLocationMessage(null);
        }, 2000);
      } else if (result.source === 'denied') {
        console.log('[Step6] Location permission denied');
        setLocationMessage('Location access denied - please select manually');
        // Set defaults for denied case
        setCitizenshipCountry('United States');
        setResidenceCountry('United States');
        setTimeout(() => setLocationMessage(null), 3000);
      } else {
        console.log('[Step6] Location detection failed:', result.error);
        setLocationMessage('Could not detect location - please select manually');
        // Set defaults for failed case
        setCitizenshipCountry('United States');
        setResidenceCountry('United States');
        setTimeout(() => setLocationMessage(null), 3000);
      }
    } catch (error) {
      console.error('[Step6] Location detection error:', error);
      setDetectionAttempted(true);
      setLocationMessage('Location detection failed');
      // Set defaults
      setCitizenshipCountry('United States');
      setResidenceCountry('United States');
      setTimeout(() => setLocationMessage(null), 2000);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Handle manual country change
  const handleCitizenshipChange = (value: string) => {
    setCitizenshipCountry(value);
    setUserManuallyChanged(true);
  };

  const handleResidenceChange = (value: string) => {
    setResidenceCountry(value);
    setUserManuallyChanged(true);
  };

  const handleContinue = async () => {
    if (!userId || !config.supabaseClient || !canContinue) return;

    setIsLoading(true);
    try {
      await config.supabaseClient
        .from('onboarding_data')
        .update({
          citizenship_country: citizenshipCountry,
          residence_country: residenceCountry,
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

  // Get button text based on state
  const getButtonText = () => {
    if (isLoading) return 'Saving...';
    if (isDetectingLocation) return 'Detecting location...';
    return 'Continue';
  };

  return (
    <div 
      className="bg-slate-50 min-h-screen"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <div className="relative flex min-h-screen w-full flex-col bg-white max-w-[500px] mx-auto shadow-xl overflow-hidden border-x border-slate-100">
        
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
        <main className="flex-1 flex flex-col px-6 pb-44">
          {/* Header Section */}
          <div className="mb-8 text-center">
            <h1 className="text-slate-900 text-[22px] font-bold leading-tight tracking-tight mb-3">
              Confirm your residence
            </h1>
            <p className="text-slate-500 text-[14px] font-normal leading-relaxed">
              We need to know where you live and pay taxes to open your investment account.
            </p>
            
            {/* GPS Location Detection Status */}
            {(isDetectingLocation || locationMessage) && (
              <div className={`mt-4 py-2 px-4 rounded-full inline-flex items-center gap-2 text-sm font-medium transition-all ${
                isDetectingLocation 
                  ? 'bg-blue-50 text-blue-600' 
                  : locationDetected
                    ? 'bg-green-50 text-green-600'
                    : 'bg-amber-50 text-amber-600'
              }`}>
                {isDetectingLocation ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{locationMessage}</span>
                  </>
                ) : (
                  <>
                    <LocationIcon />
                    <span>{locationMessage}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Carded Form Block */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 mb-8">
            {/* Country of Citizenship */}
            <div className="mb-6 relative">
              <label className="block text-slate-900 text-sm font-medium leading-normal mb-2 ml-1">
                Country of citizenship
              </label>
              <div className="relative">
                <select
                  value={citizenshipCountry}
                  onChange={(e) => handleCitizenshipChange(e.target.value)}
                  disabled={isDetectingLocation}
                  className="w-full bg-white text-slate-900 border border-gray-200 rounded-xl h-14 px-4 pr-10 text-base font-normal focus:outline-none focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] transition-all cursor-pointer appearance-none disabled:bg-slate-50 disabled:cursor-wait"
                >
                  <option disabled value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <ChevronDownIcon />
                </div>
              </div>
            </div>

            {/* Country of Residence */}
            <div className="relative">
              <label className="block text-slate-900 text-sm font-medium leading-normal mb-2 ml-1">
                Country of residence
              </label>
              <div className="relative">
                <select
                  value={residenceCountry}
                  onChange={(e) => handleResidenceChange(e.target.value)}
                  disabled={isDetectingLocation}
                  className="w-full bg-white text-slate-900 border border-gray-200 rounded-xl h-14 px-4 pr-10 text-base font-normal focus:outline-none focus:border-[#2b8cee] focus:ring-1 focus:ring-[#2b8cee] transition-all cursor-pointer appearance-none disabled:bg-slate-50 disabled:cursor-wait"
                >
                  <option disabled value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500">
                  <ChevronDownIcon />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Fixed Footer - Hidden when main footer is visible */}
        {!isFooterVisible && (
          <div className="fixed bottom-0 left-0 right-0 z-20 w-full max-w-[500px] mx-auto bg-white border-t border-slate-100 p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]" data-onboarding-footer>
            {/* Buttons */}
            <div className="flex flex-col gap-4">
              {/* Continue Button */}
              <button
                onClick={handleContinue}
                disabled={!canContinue || isLoading || isDetectingLocation}
                className={`flex w-full h-12 cursor-pointer items-center justify-center rounded-full text-base font-bold transition-all active:scale-[0.98] ${
                  canContinue && !isLoading && !isDetectingLocation
                    ? 'bg-[#2b8cee] text-white hover:bg-[#2070c0] shadow-md shadow-[#2b8cee]/20'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isDetectingLocation && (
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {getButtonText()}
              </button>

              {/* Back Button */}
              <button
                onClick={handleBack}
                className="flex w-full cursor-pointer items-center justify-center rounded-full bg-transparent py-2 text-slate-500 text-sm font-bold hover:text-slate-800 transition-colors"
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
