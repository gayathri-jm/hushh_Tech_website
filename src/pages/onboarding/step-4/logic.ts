/**
 * Step 4 — Location & Address (Merged KYC Step)
 *
 * Single step that:
 * 1. Requests GPS permission
 * 2. Reverse geocodes via Google (Supabase edge function)
 * 3. Auto-fills citizenship, residence, and full address
 * 4. All address fields are READ-ONLY (KYC)
 * 5. Only citizenship is editable (user may be an expat)
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../../resources/config/config';
import { upsertOnboardingData } from '../../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../../utils/useFooterVisibility';
import {
  locationService,
  type LocationData,
  COUNTRY_CODE_TO_NAME,
} from '../../../services/location';

/* ═══ Constants ═══ */
export const CURRENT_STEP = 4;
export const TOTAL_STEPS = 12;
export const PROGRESS_PCT = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100);

/** Sorted country list for citizenship dropdown */
export const countries = [
  'United States','Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia',
  'Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus',
  'Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil',
  'Brunei','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Cape Verde',
  'Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica',
  'Croatia','Cuba','Cyprus','Czech Republic','Denmark','Djibouti','Dominica','Dominican Republic',
  'East Timor','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Ethiopia',
  'Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada',
  'Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India',
  'Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan',
  'Kenya','Kiribati','North Korea','South Korea','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon',
  'Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Macedonia','Madagascar',
  'Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius',
  'Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique',
  'Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria',
  'Norway','Oman','Pakistan','Palau','Panama','Papua New Guinea','Paraguay','Peru','Philippines',
  'Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia',
  'Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia',
  'Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia',
  'Solomon Islands','Somalia','South Africa','South Sudan','Spain','Sri Lanka','Sudan',
  'Suriname','Swaziland','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania',
  'Thailand','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu',
  'Uganda','Ukraine','United Arab Emirates','United Kingdom','Uruguay','Uzbekistan','Vanuatu',
  'Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

export type LocationStatus =
  | 'detecting'
  | 'success'
  | 'denied'
  | 'failed'
  | 'manual'
  | null;

/* ═══ Address state populated from Google geocode ═══ */
export interface DetectedAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  stateCode: string;
  country: string;
  countryCode: string;
  zipCode: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
}

const EMPTY_ADDRESS: DetectedAddress = {
  addressLine1: '', addressLine2: '', city: '', state: '', stateCode: '',
  country: '', countryCode: '', zipCode: '', fullAddress: '',
  latitude: 0, longitude: 0,
};

/* ═══ Hook return type ═══ */
export interface Step4Logic {
  citizenshipCountry: string;
  address: DetectedAddress;
  isLoading: boolean;
  isFooterVisible: boolean;
  isDetectingLocation: boolean;
  locationStatus: LocationStatus;
  showLocationModal: boolean;
  canContinue: boolean;
  showPermissionHelp: boolean;
  handleCitizenshipChange: (v: string) => void;
  handleAllowLocation: () => Promise<void>;
  handleDontAllow: () => void;
  handleRedetect: () => Promise<void>;
  handleContinue: () => Promise<void>;
  handleBack: () => void;
  handleSkip: () => void;
  setShowPermissionHelp: (v: boolean) => void;
}

/* ═══ Main Hook ═══ */
export const useStep4Logic = (): Step4Logic => {
  const navigate = useNavigate();
  const isFooterVisible = useFooterVisibility();

  const [userId, setUserId] = useState<string | null>(null);
  const [citizenshipCountry, setCitizenshipCountry] = useState('');
  const [address, setAddress] = useState<DetectedAddress>(EMPTY_ADDRESS);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [hasPreviousData, setHasPreviousData] = useState(false);

  // Can continue only if we have an address (GPS or saved)
  const canContinue = Boolean(address.country);

  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0); }, []);

  /* ── Parse Google geocode result into address fields ── */
  const parseLocationData = (data: LocationData): DetectedAddress => {
    const countryName = COUNTRY_CODE_TO_NAME[data.countryCode] || data.country;
    // Build address line from formatted address (take first part before city)
    let line1 = '';
    if (data.formattedAddress) {
      const parts = data.formattedAddress.split(',').map((p: string) => p.trim());
      // Usually: "Street, City, State ZIP, Country"
      // Take first part(s) before city as address line
      if (parts.length >= 3) {
        line1 = parts[0];
      } else {
        line1 = data.formattedAddress;
      }
    }

    return {
      addressLine1: line1,
      addressLine2: '',
      city: data.city || '',
      state: data.state || '',
      stateCode: data.stateCode || '',
      country: countryName,
      countryCode: data.countryCode || '',
      zipCode: data.postalCode || '',
      fullAddress: data.formattedAddress || '',
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
    };
  };

  /* ── GPS detect → Google reverse geocode ── */
  const detectLocation = useCallback(async (uid: string) => {
    setIsDetectingLocation(true);
    setLocationStatus('detecting');
    try {
      const result = await locationService.detectLocation();

      if (result.source === 'detected' && result.data) {
        const parsed = parseLocationData(result.data);
        setAddress(parsed);
        // Set residence = detected country, citizenship = same (if not already set)
        if (!citizenshipCountry) {
          const cName = COUNTRY_CODE_TO_NAME[result.data.countryCode] || result.data.country;
          if (countries.includes(cName)) setCitizenshipCountry(cName);
        }
        setLocationStatus('success');
        console.log('[Step4] GPS success:', parsed.fullAddress);

        // Save GPS data to DB in background
        locationService.saveLocationToOnboarding(uid, result.data)
          .catch((e: unknown) => console.warn('[Step4] GPS background save failed:', e));

      } else if (result.source === 'denied') {
        setLocationStatus('denied');
        console.log('[Step4] GPS denied by user');
      } else {
        setLocationStatus('failed');
        console.log('[Step4] GPS detection failed');
      }
    } catch (err) {
      console.error('[Step4] Location error:', err);
      setLocationStatus('failed');
    } finally {
      setIsDetectingLocation(false);
    }
  }, [citizenshipCountry]);

  /* ── Load saved data + Plaid identity on mount ── */
  useEffect(() => {
    const init = async () => {
      if (!config.supabaseClient) return;
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);

      // Load saved onboarding data
      const { data } = await config.supabaseClient
        .from('onboarding_data')
        .select('citizenship_country, residence_country, address_line_1, address_line_2, address_country, state, city, zip_code, gps_latitude, gps_longitude, gps_full_address')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.address_line_1) {
        // Return visit — restore saved address
        setAddress({
          addressLine1: data.address_line_1 || '',
          addressLine2: data.address_line_2 || '',
          city: data.city || '',
          state: data.state || '',
          stateCode: data.state || '',
          country: COUNTRY_CODE_TO_NAME[data.address_country] || data.residence_country || '',
          countryCode: data.address_country || '',
          zipCode: data.zip_code || '',
          fullAddress: data.gps_full_address || '',
          latitude: data.gps_latitude || 0,
          longitude: data.gps_longitude || 0,
        });
        setLocationStatus('success');
        setHasPreviousData(true);
        console.log('[Step4] Restored saved address from DB');
      }

      if (data?.citizenship_country) {
        setCitizenshipCountry(data.citizenship_country);
      }

      // Plaid identity — pre-fill citizenship if available
      try {
        const { data: finData } = await config.supabaseClient
          .from('user_financial_data')
          .select('identity_data')
          .eq('user_id', user.id)
          .maybeSingle();

        if (finData?.identity_data) {
          const accounts = finData.identity_data.accounts || [];
          const owner = accounts[0]?.owners?.[0];
          if (owner?.addresses?.length) {
            const primaryAddr = owner.addresses.find((a: any) => a.primary) || owner.addresses[0];
            const addrData = primaryAddr?.data || {};
            if (addrData.country && !data?.citizenship_country) {
              const code = addrData.country.toUpperCase();
              const name = COUNTRY_CODE_TO_NAME[code] || addrData.country;
              if (countries.includes(name)) {
                setCitizenshipCountry(name);
                console.log('[Step4] Citizenship pre-filled from Plaid:', name);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Step4] Plaid identity fetch failed:', err);
      }

      // Show location modal if no saved address
      if (!data?.address_line_1) {
        setShowLocationModal(true);
      }
    };

    init();
    return () => { locationService.cancel(); };
  }, [navigate]);

  /* ── Handlers ── */
  const handleCitizenshipChange = (value: string) => {
    setCitizenshipCountry(value);
  };

  const handleAllowLocation = async () => {
    if (!userId) return;
    setShowLocationModal(false);
    await detectLocation(userId);
  };

  const handleDontAllow = () => {
    setShowLocationModal(false);
    setLocationStatus('denied');
  };

  const handleRedetect = async () => {
    if (!userId) return;
    setAddress(EMPTY_ADDRESS);
    setLocationStatus(null);
    await detectLocation(userId);
  };

  const handleContinue = async () => {
    if (!userId || !config.supabaseClient || !canContinue) return;
    setIsLoading(true);
    try {
      const payload: Record<string, any> = {
        citizenship_country: citizenshipCountry,
        residence_country: address.country || citizenshipCountry,
        address_line_1: address.addressLine1,
        address_line_2: address.addressLine2,
        address_country: address.countryCode || address.country,
        state: address.stateCode || address.state,
        city: address.city,
        zip_code: address.zipCode,
        gps_latitude: address.latitude || null,
        gps_longitude: address.longitude || null,
        gps_full_address: address.fullAddress || null,
        gps_city: address.city || null,
        gps_state: address.state || null,
        gps_country: address.country || null,
        gps_zip_code: address.zipCode || null,
        gps_detected_at: new Date().toISOString(),
        current_step: 4,
      };
      console.log('[Step4] Saving full address:', payload);
      await upsertOnboardingData(userId, payload);
      navigate('/onboarding/step-5');
    } catch (error) {
      console.error('[Step4] Save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => navigate('/onboarding/step-2');
  const handleSkip = () => navigate('/onboarding/step-5');

  return {
    citizenshipCountry, address, isLoading, isFooterVisible,
    isDetectingLocation, locationStatus, showLocationModal,
    canContinue, showPermissionHelp,
    handleCitizenshipChange, handleAllowLocation, handleDontAllow,
    handleRedetect, handleContinue, handleBack, handleSkip,
    setShowPermissionHelp,
  };
};
