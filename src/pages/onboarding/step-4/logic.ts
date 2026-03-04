/**
 * Step 4 — Confirm Residence + Full Address
 * Merges country detection (old step-4) + address entry (old step-8).
 * Sources: GPS for current address, Plaid for bank/citizenship address.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../../resources/config/config';
import { upsertOnboardingData } from '../../../services/onboarding/upsertOnboardingData';
import { useFooterVisibility } from '../../../utils/useFooterVisibility';
import { useLocationDropdowns } from '../../../hooks/useLocationDropdowns';
import { locationService, type LocationData, COUNTRY_CODE_TO_NAME } from '../../../services/location';

export const CURRENT_STEP = 4;
export const TOTAL_STEPS = 12;
export const PROGRESS_PCT = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100);

export const countries = [
  'United States','Afghanistan','Albania','Algeria','Andorra','Angola','Argentina','Armenia','Australia',
  'Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin',
  'Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso',
  'Burundi','Cambodia','Cameroon','Canada','Cape Verde','Central African Republic','Chad','Chile','China',
  'Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark','Djibouti',
  'Dominica','Dominican Republic','East Timor','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea',
  'Estonia','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece',
  'Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India',
  'Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya',
  'Kiribati','North Korea','South Korea','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia',
  'Libya','Liechtenstein','Lithuania','Luxembourg','Macedonia','Madagascar','Malawi','Malaysia','Maldives',
  'Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco',
  'Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands',
  'New Zealand','Nicaragua','Niger','Nigeria','Norway','Oman','Pakistan','Palau','Panama',
  'Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda',
  'Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino',
  'Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore',
  'Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Sudan','Spain','Sri Lanka','Sudan',
  'Suriname','Swaziland','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Togo',
  'Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine',
  'United Arab Emirates','United Kingdom','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela',
  'Vietnam','Yemen','Zambia','Zimbabwe',
];

export type LocationStatus = 'detecting' | 'success' | 'ip-success' | 'denied' | 'failed' | 'manual' | null;

/* ── Plaid bank address shape ── */
export interface BankAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Step4Logic {
  /* Country */
  citizenshipCountry: string;
  residenceCountry: string;
  plaidLinked: boolean;
  /* Address */
  addressLine1: string;
  addressLine2: string;
  setAddressLine2: (v: string) => void;
  zipCode: string;
  bankAddress: BankAddress | null;
  /* Dropdowns */
  dropdowns: ReturnType<typeof useLocationDropdowns>;
  /* UI state */
  isLoading: boolean;
  isFooterVisible: boolean;
  isDetectingLocation: boolean;
  locationDetected: boolean;
  locationStatus: LocationStatus;
  detectedLocation: string;
  showPermissionHelp: boolean;
  showLocationModal: boolean;
  canContinue: boolean;
  isErrorStatus: boolean;
  isSuccessStatus: boolean;
  shouldShowForm: boolean;
  /* Handlers */
  handleCitizenshipChange: (v: string) => void;
  handleResidenceChange: (v: string) => void;
  handleAddressLine1Change: (v: string) => void;
  handleZipCodeChange: (v: string) => void;
  handleRetry: () => Promise<void>;
  handleAllowLocation: () => Promise<void>;
  handleDontAllow: () => void;
  handleContinue: () => Promise<void>;
  handleBack: () => void;
  handleSkip: () => void;
  setShowPermissionHelp: (v: boolean) => void;
}

export const useStep4Logic = (): Step4Logic => {
  const navigate = useNavigate();
  const isFooterVisible = useFooterVisibility();
  const dropdowns = useLocationDropdowns();

  /* ── Country state ── */
  const [userId, setUserId] = useState<string | null>(null);
  const [citizenshipCountry, setCitizenshipCountry] = useState('');
  const [residenceCountry, setResidenceCountry] = useState('');
  const [plaidLinked, setPlaidLinked] = useState(false);

  /* ── Address state ── */
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [bankAddress, setBankAddress] = useState<BankAddress | null>(null);

  /* ── UI state ── */
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(null);
  const [detectedLocation, setDetectedLocation] = useState('');
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [hasPreviousData, setHasPreviousData] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  /* ── Derived state ── */
  const canContinue = locationDetected || hasPreviousData || Boolean(residenceCountry);
  const isErrorStatus = locationStatus === 'denied' || locationStatus === 'failed';
  const isSuccessStatus = locationStatus === 'success' || locationStatus === 'ip-success';
  const shouldShowForm = Boolean(locationStatus || hasPreviousData);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  /* ── Init: Load saved data + Plaid + auto-detect ── */
  useEffect(() => {
    const init = async () => {
      if (!config.supabaseClient) return;
      const { data: { user } } = await config.supabaseClient.auth.getUser();
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);

      /* Load previously saved onboarding data */
      const { data } = await config.supabaseClient
        .from('onboarding_data')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        if (data.citizenship_country) setCitizenshipCountry(data.citizenship_country);
        if (data.residence_country) setResidenceCountry(data.residence_country);
        if (data.address_line_1) {
          setAddressLine1(data.address_line_1);
          setAddressLine2(data.address_line_2 || '');
          setZipCode(data.zip_code || '');
          setHasPreviousData(true);
          setLocationDetected(true);
          /* Restore dropdowns from saved address */
          const code = locationService.mapCountryToIsoCode(data.address_country || data.residence_country || 'US');
          dropdowns.applyDetectedLocation(code, data.state, undefined, data.city);
          setLocationStatus('success');
        } else if (data.residence_country) {
          setHasPreviousData(true);
        }
      }

      /* ── Fetch Plaid identity data ── */
      let plaidCity = '';
      try {
        const { data: finData } = await config.supabaseClient
          .from('user_financial_data')
          .select('identity_data')
          .eq('user_id', user.id)
          .maybeSingle();

        if (finData?.identity_data) {
          const accounts = finData.identity_data.accounts || [];
          const owners = accounts[0]?.owners || [];
          const owner = owners[0];
          if (owner?.addresses?.length) {
            const primaryAddr = owner.addresses.find((a: any) => a.primary) || owner.addresses[0];
            const addr = primaryAddr?.data || {};

            /* Citizenship from Plaid */
            if (addr.country && !data?.citizenship_country) {
              const plaidCode = addr.country.toUpperCase();
              const plaidName = COUNTRY_CODE_TO_NAME[plaidCode] || addr.country;
              if (countries.includes(plaidName)) {
                setCitizenshipCountry(plaidName);
                setPlaidLinked(true);
              }
            }

            /* Bank address from Plaid (read-only display) */
            const bAddr: BankAddress = {
              street: addr.street || '',
              city: addr.city || '',
              state: addr.region || '',
              postalCode: addr.postal_code || '',
              country: addr.country ? (COUNTRY_CODE_TO_NAME[addr.country.toUpperCase()] || addr.country) : '',
            };
            if (bAddr.street || bAddr.city) {
              setBankAddress(bAddr);
              setPlaidLinked(true);
            }
            plaidCity = addr.city || '';

            /* Pre-fill address line 1 from Plaid if no GPS yet */
            if (addr.street && !data?.address_line_1) setAddressLine1(addr.street);
            if (addr.postal_code && !data?.zip_code) setZipCode(addr.postal_code);
          }
        }
      } catch (err) {
        console.warn('[Step4] Plaid identity fetch failed:', err);
      }

      /* ── Auto-detect location if no previous address ── */
      if (!data?.address_line_1) {
        /* Check if location was previously granted (skip modal) */
        const wasGranted = locationService.wasLocationGranted();
        if (wasGranted) {
          /* Auto-detect without showing modal */
          await detectAndFillAddress(user.id, plaidCity);
        } else {
          setShowLocationModal(true);
        }
      }
    };
    init();
    return () => { locationService.cancel(); };
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── GPS detection + address fill ── */
  const detectAndFillAddress = async (uid: string, plaidCity?: string) => {
    setIsDetectingLocation(true);
    setLocationStatus('detecting');
    try {
      const result = await locationService.detectLocation();
      if ((result.source === 'detected' || result.source === 'ip-detected') && result.data) {
        const loc: LocationData = result.data;
        const countryName = COUNTRY_CODE_TO_NAME[loc.countryCode] || loc.country;

        /* Set residence country */
        if (countries.includes(countryName)) setResidenceCountry(countryName);

        /* Parse address from GPS */
        if (loc.formattedAddress) {
          const parsed = locationService.parseFormattedAddress(loc.formattedAddress, loc);
          if (parsed.line1 && !addressLine1) setAddressLine1(parsed.line1);
          if (parsed.line2) setAddressLine2(parsed.line2);
        }
        if (loc.postalCode && !zipCode) setZipCode(loc.postalCode);

        /* Apply country/state/city to dropdowns */
        const bestCity = plaidCity || loc.city;
        dropdowns.applyDetectedLocation(loc.countryCode, loc.stateCode, loc.state, bestCity);

        /* Display only first city candidate (strip pipe-separated fallbacks) */
        const displayCity = (loc.city || '').split('|')[0].trim();
        setDetectedLocation(displayCity || loc.state || countryName);
        setLocationDetected(true);
        setLocationStatus(result.source === 'detected' ? 'success' : 'ip-success');

        /* Save GPS data to DB */
        locationService.saveLocationToOnboarding(uid, loc).catch(() => {});
      } else if (result.source === 'denied') {
        setLocationStatus('denied');
      } else {
        setLocationStatus('failed');
      }
    } catch (error) {
      console.error('[Step4] Location error:', error);
      setLocationStatus('failed');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  /* ── Handlers ── */
  const handleCitizenshipChange = (v: string) => setCitizenshipCountry(v);
  const handleResidenceChange = (v: string) => setResidenceCountry(v);
  const handleAddressLine1Change = (v: string) => setAddressLine1(v);
  const handleZipCodeChange = (v: string) => setZipCode(v.slice(0, 10));

  const handleRetry = async () => {
    setLocationDetected(false);
    if (userId) await detectAndFillAddress(userId);
  };

  const handleAllowLocation = async () => {
    if (!userId) return;
    setShowLocationModal(false);
    await detectAndFillAddress(userId);
  };

  const handleDontAllow = () => {
    setShowLocationModal(false);
    setLocationStatus('manual');
    setHasPreviousData(true); // show form for manual entry
  };

  const handleContinue = async () => {
    if (!userId || !config.supabaseClient || !canContinue) return;
    setIsLoading(true);
    try {
      const payload: Record<string, any> = {
        citizenship_country: citizenshipCountry || null,
        residence_country: residenceCountry || null,
        current_step: 4,
      };
      /* Save address fields if filled */
      if (addressLine1.trim()) {
        /* Convert ISO codes → full names for DB storage */
        const countryMatch = dropdowns.countries.find(c => c.isoCode === dropdowns.country);
        const stateMatch = dropdowns.states.find(s => s.isoCode === dropdowns.state);

        payload.address_line_1 = addressLine1.trim();
        payload.address_line_2 = addressLine2.trim() || null;
        payload.address_country = countryMatch?.name || residenceCountry || null;
        payload.state = stateMatch?.name || dropdowns.state || null;
        /* City auto-detected from GPS (no dropdown), strip pipe-separated fallbacks */
        const detectedCity = (dropdowns.city || '').split('|')[0].trim();
        payload.city = detectedCity || null;
        payload.zip_code = zipCode.trim() || null;
      }
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
    citizenshipCountry, residenceCountry, plaidLinked,
    addressLine1, addressLine2, setAddressLine2, zipCode, bankAddress,
    dropdowns,
    isLoading, isFooterVisible, isDetectingLocation, locationDetected,
    locationStatus, detectedLocation, showPermissionHelp, showLocationModal,
    canContinue, isErrorStatus, isSuccessStatus, shouldShowForm,
    handleCitizenshipChange, handleResidenceChange,
    handleAddressLine1Change, handleZipCodeChange,
    handleRetry, handleAllowLocation, handleDontAllow, handleContinue,
    handleBack, handleSkip, setShowPermissionHelp,
  };
};
