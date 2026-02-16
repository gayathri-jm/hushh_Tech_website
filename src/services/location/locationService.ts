/**
 * Location Service
 * Handles GPS-based and IP-based location detection.
 * Uses Permissions API to check geolocation state before requesting.
 * Falls back to IP geolocation when GPS is unavailable.
 */

import config from '../../resources/config/config';
import {
  LocationData,
  Country,
  State,
  City,
  GeocodeApiResponse,
  LocationsApiResponse,
  LocationDetectionResult,
  Coordinates,
  GeoPermissionState,
  COUNTRY_CODE_TO_NAME,
  COUNTRY_NAME_TO_CODE,
} from './types';

// API Endpoints
const LOCATIONS_API = `${config.SUPABASE_URL}/functions/v1/get-locations`;
const GEOCODE_API = `${config.SUPABASE_URL}/functions/v1/hushh-location-geocode`;

// IP Geolocation fallback (free, no API key needed)
const IP_GEO_API = 'https://ipapi.co/json/';

/**
 * LocationService - Centralized service for all location-related API calls.
 * Supports GPS detection with browser permission popup + IP-based fallback.
 */
export class LocationService {
  private abortController: AbortController | null = null;

  /** Cancel any pending requests */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check current geolocation permission state.
   * Returns: 'granted' | 'denied' | 'prompt' | 'unavailable'
   */
  async checkPermissionState(): Promise<GeoPermissionState> {
    // Check if geolocation API exists at all
    if (!navigator.geolocation) {
      console.log('[LocationService] navigator.geolocation not available');
      return 'unavailable';
    }

    // Use Permissions API if available (Chrome, Edge, Firefox)
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        console.log('[LocationService] Permission state:', result.state);
        return result.state as GeoPermissionState;
      } catch (err) {
        // Permissions API not supported for geolocation (Safari, some WebViews)
        console.log('[LocationService] Permissions API not supported, will try direct request');
        return 'prompt'; // Assume we can prompt
      }
    }

    // No Permissions API (Safari, Capacitor WebView)
    // Return 'prompt' to try the direct getCurrentPosition call
    console.log('[LocationService] No Permissions API, assuming prompt available');
    return 'prompt';
  }

  /**
   * Get current GPS coordinates from browser.
   * This triggers the browser's native permission popup.
   */
  async getGpsCoordinates(options?: PositionOptions): Promise<Coordinates> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not available');
    }

    return new Promise((resolve, reject) => {
      console.log('[LocationService] Calling navigator.geolocation.getCurrentPosition...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('[LocationService] GPS success:', position.coords.latitude, position.coords.longitude);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('[LocationService] GPS error:', error.code, error.message);
          if (error.code === 1) {
            reject(new Error('Location permission denied'));
          } else if (error.code === 2) {
            reject(new Error('Location unavailable'));
          } else if (error.code === 3) {
            reject(new Error('Location timeout'));
          } else {
            reject(new Error(`GPS error: ${error.message}`));
          }
        },
        {
          enableHighAccuracy: false, // Use low accuracy first for faster response
          timeout: 15000, // 15 seconds timeout
          maximumAge: 60000, // Accept cached position up to 1 minute old
          ...options,
        }
      );
    });
  }

  /**
   * Get location from IP address (fallback method).
   * Works everywhere - no permissions needed.
   */
  async getLocationByIp(): Promise<LocationData> {
    console.log('[LocationService] Trying IP-based geolocation...');

    this.abortController = new AbortController();

    const response = await fetch(IP_GEO_API, {
      signal: this.abortController.signal,
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`IP geolocation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[LocationService] IP geolocation result:', data);

    // Map ipapi.co response to our LocationData format
    const locationData: LocationData = {
      country: data.country_name || '',
      countryCode: data.country_code || '',
      state: data.region || '',
      stateCode: data.region_code || '',
      city: data.city || '',
      postalCode: data.postal || '',
      phoneDialCode: data.country_calling_code || '+1',
      timezone: data.timezone || 'UTC',
      formattedAddress: [data.city, data.region, data.country_name].filter(Boolean).join(', '),
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
    };

    return locationData;
  }

  /**
   * Call geocode API to convert GPS coordinates to address.
   * Uses Google Geocoding API via Supabase Edge Function.
   */
  async geocodeCoordinates(coords: Coordinates): Promise<LocationData> {
    this.abortController = new AbortController();

    const response = await fetch(GEOCODE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${config.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(coords),
      signal: this.abortController.signal,
    });

    const result: GeocodeApiResponse = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Geocoding failed');
    }

    return result.data;
  }

  /**
   * Main location detection method.
   * Flow:
   * 1. Check permission state
   * 2. If GPS available → request GPS → geocode → return
   * 3. If GPS denied/unavailable → fall back to IP geolocation
   */
  async detectLocation(): Promise<LocationDetectionResult> {
    try {
      // Step 1: Check geolocation permission state
      const permState = await this.checkPermissionState();
      console.log('[LocationService] Permission state:', permState);

      // Step 2: If GPS is available, try it first
      if (permState !== 'unavailable' && permState !== 'denied') {
        try {
          // This triggers the browser's native permission popup
          const coords = await this.getGpsCoordinates();
          console.log(`[LocationService] GPS coordinates: ${coords.latitude}, ${coords.longitude}`);

          // Geocode coordinates to address via Google API
          const locationData = await this.geocodeCoordinates(coords);
          console.log('[LocationService] GPS location detected:', locationData);

          return {
            source: 'detected',
            data: locationData,
          };
        } catch (gpsError) {
          const message = (gpsError as Error).message;
          console.warn('[LocationService] GPS failed:', message);

          // If user denied permission, don't fall back — respect their choice
          if (message === 'Location permission denied') {
            console.log('[LocationService] User denied GPS. Trying IP fallback...');
            // Fall through to IP fallback below
          }
          // For timeout/unavailable errors, fall through to IP fallback
        }
      }

      // Step 3: Fall back to IP-based geolocation
      console.log('[LocationService] Falling back to IP geolocation...');
      try {
        const ipLocation = await this.getLocationByIp();
        console.log('[LocationService] IP location detected:', ipLocation);

        return {
          source: 'ip-detected',
          data: ipLocation,
        };
      } catch (ipError) {
        console.error('[LocationService] IP geolocation also failed:', ipError);

        // If GPS was denied AND IP failed, report denied
        if (permState === 'denied') {
          return { source: 'denied', data: null, error: 'Location permission denied' };
        }

        return {
          source: 'failed',
          data: null,
          error: 'Could not detect location via GPS or IP',
        };
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        console.log('[LocationService] Request cancelled');
        return { source: 'failed', data: null, error: 'Request cancelled' };
      }

      console.error('[LocationService] Detection failed:', error);
      return {
        source: 'failed',
        data: null,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Fetch all countries for dropdown
   */
  async fetchCountries(): Promise<Country[]> {
    try {
      const response = await fetch(`${LOCATIONS_API}?type=countries`);
      const result: LocationsApiResponse<Country> = await response.json();
      if (result.error) throw new Error(result.error);
      return result.data || [];
    } catch (error) {
      console.error('[LocationService] Failed to fetch countries:', error);
      throw error;
    }
  }

  /**
   * Fetch states for a specific country
   */
  async fetchStates(countryCode: string): Promise<State[]> {
    if (!countryCode) return [];
    try {
      const response = await fetch(`${LOCATIONS_API}?type=states&country=${countryCode}`);
      const result: LocationsApiResponse<State> = await response.json();
      if (result.error) throw new Error(result.error);
      return result.data || [];
    } catch (error) {
      console.error('[LocationService] Failed to fetch states:', error);
      throw error;
    }
  }

  /**
   * Fetch cities for a specific state in a country
   */
  async fetchCities(countryCode: string, stateCode: string): Promise<City[]> {
    if (!countryCode || !stateCode) return [];
    try {
      const response = await fetch(`${LOCATIONS_API}?type=cities&country=${countryCode}&state=${stateCode}`);
      const result: LocationsApiResponse<City> = await response.json();
      if (result.error) throw new Error(result.error);
      return result.data || [];
    } catch (error) {
      console.error('[LocationService] Failed to fetch cities:', error);
      throw error;
    }
  }

  /**
   * Save GPS location data to onboarding_data table
   */
  async saveLocationToOnboarding(userId: string, locationData: LocationData): Promise<void> {
    if (!config.supabaseClient) {
      throw new Error('Supabase client not configured');
    }

    const countryName = COUNTRY_CODE_TO_NAME[locationData.countryCode] || locationData.country;

    const { error } = await config.supabaseClient
      .from('onboarding_data')
      .update({
        gps_location_data: locationData,
        gps_detected_country: countryName,
        gps_detected_state: locationData.state,
        gps_detected_city: locationData.city,
        gps_detected_postal_code: locationData.postalCode,
        gps_detected_phone_dial_code: locationData.phoneDialCode,
        gps_detected_timezone: locationData.timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[LocationService] Failed to save location:', error);
      throw error;
    }

    console.log('[LocationService] Location saved to onboarding_data');
  }

  /**
   * Get cached GPS location data from onboarding_data
   */
  async getCachedLocation(userId: string): Promise<LocationData | null> {
    if (!config.supabaseClient) return null;

    const { data, error } = await config.supabaseClient
      .from('onboarding_data')
      .select('gps_location_data')
      .eq('user_id', userId)
      .single();

    if (error || !data?.gps_location_data) return null;
    return data.gps_location_data as LocationData;
  }

  /**
   * Check if location is already cached
   */
  async hasLocationCached(userId: string): Promise<boolean> {
    const cached = await this.getCachedLocation(userId);
    return cached !== null;
  }

  /** Map country name to ISO code */
  mapCountryToIsoCode(countryName: string): string {
    return COUNTRY_NAME_TO_CODE[countryName] || countryName;
  }

  /** Map ISO code to country name */
  mapIsoCodeToCountry(isoCode: string): string {
    return COUNTRY_CODE_TO_NAME[isoCode] || isoCode;
  }

  /**
   * Find matching state in list (by code or name)
   */
  findMatchingState(states: State[], gpsState: string, gpsStateCode?: string): State | null {
    if (gpsStateCode) {
      const byCode = states.find(s => s.isoCode === gpsStateCode);
      if (byCode) return byCode;
    }
    const byName = states.find(s =>
      s.name.toLowerCase() === gpsState.toLowerCase() ||
      s.isoCode.toLowerCase() === gpsState.toLowerCase()
    );
    if (byName) return byName;
    const partial = states.find(s =>
      s.name.toLowerCase().includes(gpsState.toLowerCase()) ||
      gpsState.toLowerCase().includes(s.name.toLowerCase())
    );
    return partial || null;
  }

  /**
   * Find matching city in list
   */
  findMatchingCity(cities: City[], gpsCity: string): City | null {
    const exact = cities.find(c => c.name.toLowerCase() === gpsCity.toLowerCase());
    if (exact) return exact;
    const partial = cities.find(c =>
      c.name.toLowerCase().includes(gpsCity.toLowerCase()) ||
      gpsCity.toLowerCase().includes(c.name.toLowerCase())
    );
    return partial || null;
  }

  /**
   * Parse formatted address into address lines
   */
  parseFormattedAddress(formattedAddress: string, locationData: LocationData): { line1: string; line2: string } {
    let streetPart = formattedAddress;
    if (locationData.country && streetPart.endsWith(locationData.country)) {
      streetPart = streetPart.slice(0, -locationData.country.length).replace(/,\s*$/, '');
    }
    if (locationData.postalCode) {
      streetPart = streetPart.replace(new RegExp(`\\s*${locationData.postalCode}\\s*,?`), '');
    }
    if (locationData.state) {
      streetPart = streetPart.replace(new RegExp(`,?\\s*${locationData.state}\\s*$`), '');
    }
    if (locationData.city) {
      streetPart = streetPart.replace(new RegExp(`,?\\s*${locationData.city}\\s*$`), '');
    }
    streetPart = streetPart.replace(/,\s*$/, '').trim();
    const parts = streetPart.split(',').map(p => p.trim()).filter(p => p);
    return {
      line1: parts[0] || '',
      line2: parts.slice(1).join(', '),
    };
  }
}

// Export singleton instance
export const locationService = new LocationService();

// Export types
export * from './types';
