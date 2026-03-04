# Step 8 — Address Entry: Full Audit Report

**Date:** 2026-04-03  
**Auditor:** Code Audit  
**Files Reviewed:**
- `src/pages/onboarding/step-8/logic.ts` (ACTIVE — used by App.tsx)
- `src/pages/onboarding/step-8/ui.tsx` (ACTIVE — used by App.tsx)
- `src/pages/onboarding/Step8.tsx` (DEAD CODE — not imported anywhere)
- `src/hooks/useLocationDropdowns.ts`
- `src/services/location/locationService.ts`
- `src/services/location/types.ts`
- `src/data/locationData.ts`
- `src/services/onboarding/upsertOnboardingData.ts`
- `src/App.tsx` (routing)

---

## 1. What Step 8 Does

Step 8 collects the user's residential address:
- Address Line 1 (required)
- Address Line 2 (optional)
- Country dropdown (required)
- State dropdown (required)
- City dropdown (required)
- ZIP / Postal Code (required)

It also has a "Use My Current Location" button that auto-fills all fields via GPS/IP detection.

---

## 2. File Architecture

```
App.tsx routing:
  /onboarding/step-8 → src/pages/onboarding/step-8/ui.tsx
                         └── imports logic from → step-8/logic.ts
                              └── uses → useLocationDropdowns (hook)
                              └── uses → locationService (singleton)
                              └── uses → upsertOnboardingData (DB helper)

DEAD FILE (not imported):
  src/pages/onboarding/Step8.tsx ← DUPLICATE, different implementation
```

---

## 3. Current Location Detection Flow

### 3.1 On Page Load (init useEffect in logic.ts)

```
1. auth.getUser() → get current user
2. SELECT from onboarding_data → get saved address + residence_country

PATH A — Return Visit (address_line_1 exists):
  → Populate all fields from saved DB data
  → STOP. No GPS detection.

PATH B — First Visit (no address_line_1):
  → Collect data from 3 sources in PRIORITY ORDER:

  Source 1: Step 4 saved data
    → residence_country → bestCountryCode
    → city → bestCity

  Source 2: Plaid Identity (bank-linked address)
    → user_financial_data.identity_data
    → accounts[0].owners[0].addresses[0]
    → addr.street → addressLine1
    → addr.postal_code → zipCode
    → addr.city → bestCity (only if no Step 4 city)

  Source 3: GPS Detection
    → locationService.detectLocation()
    → postalCode → zipCode (only if Plaid didn't set it)
    → formattedAddress → parse into address lines (only if Plaid didn't set)
    → countryCode → bestCountryCode (OVERRIDES Step 4!)
    → stateCode → bestStateCode
    → city → bestCity (only if no prior source)
    → Also saves GPS data to DB in background

  FINALLY:
    → dropdowns.applyDetectedLocation(bestCountryCode, bestStateCode, bestStateName, bestCity)
```

### 3.2 GPS Detection (locationService.detectLocation())

```
Step 1: Check permission state
  → navigator.permissions.query({ name: 'geolocation' })
  → Returns: 'granted' | 'denied' | 'prompt' | 'unavailable'

Step 2: If GPS available (not denied/unavailable)
  → navigator.geolocation.getCurrentPosition()
  → Low accuracy first (8s timeout, 60s cache)
  → If accuracy > 2km → retry with high accuracy (15s timeout, no cache)
  → If low accuracy fails → retry with high accuracy
  → Result: { latitude, longitude }

Step 3: Reverse Geocoding (coordinates → address)
  → Try 3 providers sequentially:
    1. Supabase Edge Function (hushh-location-geocode) → wraps Google Maps API
    2. Nominatim (terrestris.de CORS-enabled instance)
    3. BigDataCloud (free, no API key)
  → First success returns LocationData

Step 4: If GPS fails entirely → IP Fallback
  → Try 2 IP providers:
    1. ipwho.is (primary)
    2. ipwhois.app (backup)
  → Returns approximate city-level location
```

### 3.3 Dropdown Cascade (useLocationDropdowns)

```
Country (static) → States (async from Supabase Edge Function) → Cities (async)

Data flow when applyDetectedLocation() is called:
  1. pendingState.current = stateCode
  2. pendingCity.current = cityName
  3. setCountryRaw(countryCode) ← triggers states load
  4. detectionVersion++ ← forces re-evaluation

  → States load → pendingState matched → setStateRaw() → triggers cities load
  → Cities load → pendingCity matched → setCityRaw()

  Total cascade: ~3 async steps with useEffect dependencies
```

### 3.4 "Use My Current Location" Button

```
handleDetectClick()
  → auth.getUser()
  → detectAndApply(userId)
    → locationService.detectLocation()
    → Fill: zipCode, addressLine1, addressLine2
    → dropdowns.applyDetectedLocation(country, state, stateName, city)
    → saveLocationToOnboarding (background)
    → Show detection status for 2.5s
```

### 3.5 Save (Continue click)

```
handleContinue()
  → validateAll() → check all fields
  → upsertOnboardingData(userId, {
      address_line_1, address_line_2,
      address_country: ISO code (e.g. "IN"),
      state: ISO code (e.g. "MH"),
      city: name (e.g. "Mumbai"),
      zip_code,
      current_step: 8
    })
  → navigate('/onboarding/step-9')
```

---

## 4. BUGS & ISSUES FOUND

### 🔴 CRITICAL

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| C1 | GPS overrides user's Step 4 country | `logic.ts` L108 | `if (result.data.countryCode) bestCountryCode = result.data.countryCode` — GPS blindly overwrites the country the user manually selected in Step 4. If user is traveling or on VPN, GPS gives wrong country. |
| C2 | No auth failure handling | `logic.ts` L61 | `if (!user) return;` — silently returns. User sees blank form, no error, no redirect to login. |
| C3 | `setCountryRaw` vs `setCountry` race | `useLocationDropdowns.ts` L138 | `applyDetectedLocation` uses `setCountryRaw()` which does NOT clear old states/cities. If country changes, stale dropdown data can flash briefly. |

### 🟡 MEDIUM

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| M1 | Dead legacy file | `Step8.tsx` | `src/pages/onboarding/Step8.tsx` is a complete duplicate with DIFFERENT init logic. Not imported by App.tsx. Maintenance confusion risk. |
| M2 | Plaid missing state data | `logic.ts` L87-96 | Plaid identity address has `region`/`state` field but code only takes `city`, `street`, `postal_code`. State is ignored, so city-state mismatch can happen. |
| M3 | Double error display | `logic.ts` L141 | `validateAll()` sets per-field `errors` state AND `setError('Please fix the errors above')` sets a banner. User sees errors in 2 places — confusing. |
| M4 | `states` dependency in cities useEffect | `useLocationDropdowns.ts` L93 | `[country, state, states]` — cities reload whenever states array changes, even if `state` value is same. Unnecessary API calls. |
| M5 | Step numbering confusion | `logic.ts` L13-15 | Route = `/step-8`, DISPLAY_STEP = 7, current_step DB = 8. Three different numbers for same step. |
| M6 | `isFooterVisible` unused in UI | `logic.ts` → `ui.tsx` | Hook returns `isFooterVisible` but `ui.tsx` never uses it. Dead variable. |
| M7 | `saveLocationToOnboarding` dual schema | `locationService.ts` L359-393 | Tries V2 columns first, then legacy columns. If DB has partial columns from both schemas, data goes inconsistent. |

### 🟢 LOW

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| L1 | setTimeout memory leak | `logic.ts` L98 | `setTimeout(() => setDetectionStatus(null), 2500)` — no cleanup on unmount. React warning if user navigates away fast. |
| L2 | Plaid silent failure | `logic.ts` L80-95 | Plaid identity fetch catches all errors silently. Fine since it's optional, but if both Plaid AND GPS fail, user gets blank form with no explanation. |
| L3 | `COUNTRY_NAME_TO_CODE` incomplete | `types.ts` L94-112 | Only 18 country mappings. `mapCountryToIsoCode("Germany")` returns "Germany" (not "DE") because it's not in the map. |
| L4 | Nominatim CORS risk | `locationService.ts` L29 | Uses `nominatim.terrestris.de` (third-party Nominatim mirror). This is NOT an official service and could go down anytime. |
| L5 | IP geolocation on VPN | `locationService.ts` | IP fallback gives VPN server location, not user's real location. No warning shown to user. |

---

## 5. Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│                    PAGE LOAD                         │
│                                                      │
│  ┌──────────┐     ┌──────────────┐                  │
│  │ Supabase │────►│ Saved Data?  │                  │
│  │ Auth     │     │ address_line │                  │
│  └──────────┘     └──────┬───────┘                  │
│                     YES  │  NO                       │
│                  ┌───────┘  └────────┐               │
│                  ▼                   ▼               │
│         PATH A: Restore      PATH B: Detect          │
│         from DB              ┌───────────────┐       │
│         → populate all       │ Source 1:      │       │
│         → DONE               │ Step 4 DB     │       │
│                              │ (country,city) │       │
│                              └───────┬───────┘       │
│                                      ▼               │
│                              ┌───────────────┐       │
│                              │ Source 2:      │       │
│                              │ Plaid Identity │       │
│                              │ (street,zip,   │       │
│                              │  city)         │       │
│                              └───────┬───────┘       │
│                                      ▼               │
│                              ┌───────────────┐       │
│                              │ Source 3: GPS  │       │
│                              │ or IP fallback │       │
│                              │ (everything)   │       │
│                              └───────┬───────┘       │
│                                      ▼               │
│                         applyDetectedLocation()      │
│                              ┌───────────────┐       │
│                              │ Dropdown       │       │
│                              │ Cascade:       │       │
│                              │ Country→State  │       │
│                              │ →City          │       │
│                              └───────────────┘       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│               GPS DETECTION FLOW                     │
│                                                      │
│  Permission Check                                    │
│  ├── 'granted'/'prompt' → Try GPS                   │
│  │   ├── Low accuracy (8s) ──► coords               │
│  │   │   └── accuracy > 2km? → High accuracy (15s)  │
│  │   └── GPS failed? → High accuracy retry           │
│  │                                                   │
│  │   coords ──► Reverse Geocode                      │
│  │   ├── 1. Supabase Edge Fn (Google Maps)          │
│  │   ├── 2. Nominatim (terrestris.de)               │
│  │   └── 3. BigDataCloud                            │
│  │                                                   │
│  ├── 'denied'/'unavailable' ──► IP Fallback         │
│  │   ├── 1. ipwho.is                                │
│  │   └── 2. ipwhois.app                             │
│  │                                                   │
│  └── All failed → { source: 'failed', data: null }  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│            DROPDOWN CASCADE FLOW                     │
│                                                      │
│  applyDetectedLocation(country, state, _, city)      │
│  │                                                   │
│  ├── pendingState = state                            │
│  ├── pendingCity = city                              │
│  ├── setCountryRaw(country) ← NOTE: not setCountry! │
│  └── detectionVersion++                              │
│       │                                              │
│       ▼                                              │
│  useEffect [country] → fetch states from Edge Fn     │
│       │                       (fallback: countriesnow)│
│       ▼                                              │
│  useEffect [states, detectionVersion]                │
│  → match pendingState in states list                 │
│  → setStateRaw(matched.isoCode)                     │
│       │                                              │
│       ▼                                              │
│  useEffect [country, state, states] → fetch cities   │
│       │                                              │
│       ▼                                              │
│  useEffect [cities, detectionVersion]                │
│  → match pendingCity in cities list                  │
│  → setCityRaw(matched.name)                          │
│       │                                              │
│       ▼                                              │
│  ALL DROPDOWNS POPULATED ✓                           │
│  (Total time: states fetch + cities fetch)           │
└─────────────────────────────────────────────────────┘
```

---

## 6. Database Columns Used

### Read (on page load):
```sql
-- From onboarding_data:
address_line_1, address_line_2, address_country, state, city, zip_code, residence_country

-- From user_financial_data:
identity_data  -- JSON blob with Plaid identity
```

### Write (on Continue):
```sql
-- To onboarding_data:
address_line_1, address_line_2, address_country, state, city, zip_code, current_step
```

### Write (GPS background save):
```sql
-- V2 schema:
gps_latitude, gps_longitude, gps_city, gps_state, gps_country, 
gps_zip_code, gps_full_address, gps_detected_at, updated_at

-- Legacy fallback:
gps_location_data (JSON), gps_detected_country, gps_detected_state,
gps_detected_city, gps_detected_postal_code, gps_detected_phone_dial_code,
gps_detected_timezone, updated_at
```

---

## 7. External API Dependencies

| API | Purpose | Auth | Reliability |
|-----|---------|------|-------------|
| Supabase `get-locations` | States & Cities dropdown data | anon key | High |
| Supabase `hushh-location-geocode` | GPS reverse geocoding (Google Maps wrapper) | anon key | High |
| countriesnow.space | Fallback for states/cities | None | Medium |
| nominatim.terrestris.de | Fallback reverse geocoding | None | Low (3rd party mirror) |
| api.bigdatacloud.net | Fallback reverse geocoding | None | Medium |
| ipwho.is | IP geolocation primary | None | Medium |
| ipwhois.app | IP geolocation backup | None | Medium |

---

## 8. Summary

**Total issues found: 14**
- 🔴 Critical: 3
- 🟡 Medium: 7  
- 🟢 Low: 5

**Most impactful issues:**
1. GPS silently overriding user's manually selected country from Step 4
2. No error handling when auth fails (blank page)
3. Dead legacy `Step8.tsx` file causing confusion
4. Plaid state data not being utilized
5. `setCountryRaw` vs `setCountry` causing potential stale dropdown data

**No code changes made. This is audit only.**

---

## 9. BACKEND LOGIC FLOW — Deep Dive

Step 8 ke backend me **3 systems** kaam karte hain:

### 9.1 Supabase Edge Function: `get-locations` (Dropdown Data)

**File:** `supabase/functions/get-locations/index.ts`  
**URL:** `{SUPABASE_URL}/functions/v1/get-locations`  
**Auth:** PUBLIC — no auth required (only `apikey` header from frontend)  
**Library:** `country-state-city@3.2.1` (npm package running on Deno)

**What it does:**
```
GET /get-locations?type=countries
  → Country.getAllCountries() → returns [{isoCode, name}, ...]

GET /get-locations?type=states&country=IN
  → State.getStatesOfCountry("IN") → returns [{isoCode, name}, ...]

GET /get-locations?type=cities&country=IN&state=MH
  → City.getCitiesOfState("IN", "MH") → returns [{name}, ...]
```

**Logic:**
1. Parse query params: `type`, `country`, `state`
2. Switch on `type`:
   - `countries` → return all countries (no params needed)
   - `states` → requires `country` param, returns states for that country
   - `cities` → requires `country` + `state`, returns cities
3. Response cached for 24 hours (`Cache-Control: public, max-age=86400`)
4. Error if missing required params (400) or server error (500)

**Backend Issues:**
- ⚠️ **No rate limiting** — PUBLIC endpoint, anyone can spam it
- ⚠️ **No input validation** on country/state codes — passes raw string to library
- ✅ Good: 24hr cache header reduces repeat calls
- ✅ Good: CORS properly configured

---

### 9.2 Supabase Edge Function: `hushh-location-geocode` (GPS → Address)

**File:** `supabase/functions/hushh-location-geocode/index.ts`  
**URL:** `{SUPABASE_URL}/functions/v1/hushh-location-geocode`  
**Auth:** Uses `apikey` + `Authorization: Bearer` (anon key)  
**Method:** POST

**What it does:**
```
POST /hushh-location-geocode
Body: { latitude: 28.6139, longitude: 77.2090 }

Response: {
  success: true,
  data: {
    country: "India",
    countryCode: "IN",
    state: "Delhi",
    stateCode: "DL",
    city: "New Delhi",
    postalCode: "110001",
    phoneDialCode: "+91",
    timezone: "Asia/Kolkata",
    formattedAddress: "New Delhi, Delhi 110001, India",
    latitude: 28.6139,
    longitude: 77.2090
  }
}
```

**Logic:**
1. Parse `{latitude, longitude}` from request body
2. Validate: check not null, check isFinite
3. **Primary: Google Geocoding API**
   - Reads `GOOGLE_MAPS_API_KEY` from env
   - Calls `https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}&key={key}`
   - Parses `address_components` array:
     - `country` type → country + countryCode
     - `administrative_area_level_1` → state + stateCode
     - `locality` → city (fallback: `sublocality_level_1`)
     - `postal_code` → postalCode
   - Adds phoneDialCode from hardcoded mapping (50+ countries)
   - Adds timezone from hardcoded mapping (13 countries only!)
4. **Fallback: Nominatim (OpenStreetMap)**
   - If `GOOGLE_MAPS_API_KEY` not set OR Google fails
   - Calls `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=...&lon=...`
   - NOTE: Uses OFFICIAL Nominatim (with User-Agent header) — different from frontend which uses terrestris.de mirror
   - Parses address from `address` object
   - State code extracted from ISO3166-2 subdivision codes
   - City fallback chain: city → town → village → hamlet → suburb → county → state_district
5. Return structured LocationData

**Backend Issues:**
- 🔴 **Timezone mapping only covers 13 countries** — Most countries get "UTC" as fallback. Indian user in Kolkata gets correct "Asia/Kolkata", but user in Nigeria gets "UTC"
- 🔴 **Dial code mapping hardcoded on BOTH frontend AND backend** — `COUNTRY_DIAL_CODES` duplicated in locationService.ts AND hushh-location-geocode. Any update needs 2 file changes
- ⚠️ **Google API key exposure risk** — If edge function logs the full URL, API key appears in Supabase function logs
- ⚠️ **Nominatim rate limiting** — Official Nominatim has strict rate limits (1 req/second). No throttling implemented
- ⚠️ **No caching** — Same coordinates geocoded repeatedly make fresh API calls
- ✅ Good: Falls back gracefully from Google to Nominatim
- ✅ Good: Input validation for lat/lng

---

### 9.3 Supabase Direct DB: `upsertOnboardingData` (Save Address)

**File:** `src/services/onboarding/upsertOnboardingData.ts`  
**Table:** `onboarding_data`  
**Auth:** Uses Supabase client (user's JWT token for RLS)

**What it does:**
```
upsertOnboardingData(userId, {
  address_line_1: "123 Main St",
  address_line_2: "Apt 4B",
  address_country: "US",
  state: "CA",
  city: "San Francisco",
  zip_code: "94102",
  current_step: 8
})
```

**Logic (Complex!):**
1. **SELECT** — Check if row exists for this user
   ```sql
   SELECT id FROM onboarding_data WHERE user_id = '{userId}' LIMIT 1
   ```

2. **If row EXISTS → UPDATE**
   ```sql
   UPDATE onboarding_data 
   SET address_line_1='123 Main St', ..., updated_at=NOW()
   WHERE user_id = '{userId}'
   ```

3. **If row DOESN'T EXIST → INSERT**
   ```sql
   INSERT INTO onboarding_data (user_id, address_line_1, ...) 
   VALUES ('{userId}', '123 Main St', ...)
   ```

4. **Error Handling — The Defensive Layer:**

   **a) Missing Column Retry (PGRST204):**
   - If PostgREST says "Could not find column 'X' in schema cache"
   - Drops that column from payload and retries
   - Up to 5 retries, dropping 1 column per attempt
   - This handles schema migrations where DB hasn't been updated yet

   **b) Recurring Frequency Constraint Retry:**
   - If DB has a CHECK constraint on `recurring_frequency` column
   - First try: new format values (`once_a_month`, `twice_a_month`, etc.)
   - If constraint violation → retry with legacy format (`monthly`, `bimonthly`, etc.)
   - Handles both old and new DB schemas

   **c) Normalization:**
   - Converts various frequency formats (UI labels, legacy values, new values)
   - Handles empty strings, "null", "undefined" → converts to actual null

**Backend Issues:**
- 🔴 **SELECT then UPDATE/INSERT is NOT atomic** — Race condition if 2 requests come at same time. Two inserts could run simultaneously, one will fail on unique constraint
- 🟡 **Up to 5 retries per save** — If schema is badly out of sync, user waits for 5 failed DB calls before getting error
- 🟡 **Missing column retry is a HACK** — Proper fix is to keep DB schema and code in sync. This "auto-drop columns" approach silently loses data
- 🟡 **Recurring frequency handling is unrelated** — This is for a different step but the same upsert function handles ALL steps. Address step doesn't use recurring_frequency but the normalization code runs anyway
- ⚠️ **No optimistic locking** — If user has 2 tabs open, last save wins with no warning
- ✅ Good: Handles schema mismatches gracefully (won't crash)
- ✅ Good: Comprehensive error logging

---

### 9.4 Supabase Direct DB: `saveLocationToOnboarding` (GPS Background Save)

**File:** `src/services/location/locationService.ts` (method on LocationService class)  
**Table:** `onboarding_data`

**What it does (runs in BACKGROUND, fire-and-forget):**
```
locationService.saveLocationToOnboarding(userId, gpsLocationData)
// Called with .catch(() => {}) — errors silently swallowed
```

**Logic:**
1. **Try V2 schema first:**
   ```sql
   UPDATE onboarding_data SET
     gps_latitude = 28.6139,
     gps_longitude = 77.2090,
     gps_city = 'New Delhi',
     gps_state = 'Delhi',
     gps_country = 'India',
     gps_zip_code = '110001',
     gps_full_address = 'New Delhi, Delhi 110001, India',
     gps_detected_at = '2026-04-03T...',
     updated_at = '2026-04-03T...'
   WHERE user_id = '{userId}'
   ```

2. **If V2 fails with PGRST204 (columns don't exist) → Try Legacy schema:**
   ```sql
   UPDATE onboarding_data SET
     gps_location_data = {full JSON blob},
     gps_detected_country = 'India',
     gps_detected_state = 'Delhi',
     gps_detected_city = 'New Delhi',
     gps_detected_postal_code = '110001',
     gps_detected_phone_dial_code = '+91',
     gps_detected_timezone = 'Asia/Kolkata',
     updated_at = '2026-04-03T...'
   WHERE user_id = '{userId}'
   ```

**Backend Issues:**
- 🔴 **Country stored as NAME, not ISO code** — `gps_country = 'India'` instead of 'IN'. But address save uses ISO code (`address_country = 'IN'`). Inconsistent data
- 🟡 **Dual schema is confusing** — V2 uses `gps_*` columns, Legacy uses `gps_location_data` JSON blob + `gps_detected_*` columns. Hard to know which schema is active
- 🟡 **Fire-and-forget** — Errors are `.catch(() => {})` swallowed. If GPS data fails to save, nobody knows
- ⚠️ **Uses UPDATE only, no INSERT** — If `upsertOnboardingData` hasn't created the row yet (user hasn't clicked Continue), this UPDATE does nothing silently

---

## 10. Complete Backend API Call Sequence

```
┌──────────────────────────────────────────────────────────────────┐
│                    STEP 8 — BACKEND CALLS                        │
│                                                                  │
│  PAGE LOAD:                                                      │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ 1. auth.getUser()                                       │     │
│  │    → Supabase Auth (JWT validation)                     │     │
│  │                                                         │     │
│  │ 2. SELECT onboarding_data                               │     │
│  │    → Supabase PostgREST (direct DB)                     │     │
│  │    Fields: address_line_1, address_line_2,              │     │
│  │            address_country, state, city, zip_code,      │     │
│  │            residence_country                            │     │
│  │                                                         │     │
│  │ 3. SELECT user_financial_data (Plaid identity)          │     │
│  │    → Supabase PostgREST (direct DB)                     │     │
│  │    Fields: identity_data (JSON blob)                    │     │
│  │                                                         │     │
│  │ 4. GPS Detection (browser API — NOT a backend call)     │     │
│  │    → navigator.geolocation.getCurrentPosition()         │     │
│  │                                                         │     │
│  │ 5. Reverse Geocode (if GPS succeeds)                    │     │
│  │    → POST /functions/v1/hushh-location-geocode          │     │
│  │      Body: {latitude, longitude}                        │     │
│  │      → Google Maps API (or Nominatim fallback)          │     │
│  │    OR (if edge function fails):                         │     │
│  │    → GET nominatim.terrestris.de/reverse?...            │     │
│  │    OR:                                                  │     │
│  │    → GET api.bigdatacloud.net/...                       │     │
│  │                                                         │     │
│  │ 5b. IP Fallback (if GPS fails)                          │     │
│  │    → GET https://ipwho.is/                              │     │
│  │    OR:                                                  │     │
│  │    → GET https://ipwhois.app/json/                      │     │
│  │                                                         │     │
│  │ 6. Background GPS Save                                  │     │
│  │    → UPDATE onboarding_data SET gps_* columns           │     │
│  │      (fire-and-forget, errors swallowed)                │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  DROPDOWN LOADING (cascading):                                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ 7. Countries → STATIC (no API call)                     │     │
│  │                                                         │     │
│  │ 8. States:                                              │     │
│  │    → GET /functions/v1/get-locations?type=states&        │     │
│  │          country=IN                                     │     │
│  │      (uses country-state-city npm on Deno)              │     │
│  │    Fallback:                                            │     │
│  │    → POST countriesnow.space/api/v0.1/countries/states  │     │
│  │                                                         │     │
│  │ 9. Cities:                                              │     │
│  │    → GET /functions/v1/get-locations?type=cities&        │     │
│  │          country=IN&state=MH                            │     │
│  │    Fallback:                                            │     │
│  │    → POST countriesnow.space/api/v0.1/countries/        │     │
│  │          state/cities                                   │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  CONTINUE CLICK:                                                 │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ 10. auth.getUser()                                      │     │
│  │     → Supabase Auth                                     │     │
│  │                                                         │     │
│  │ 11. upsertOnboardingData()                              │     │
│  │     → SELECT onboarding_data (check if row exists)      │     │
│  │     → UPDATE or INSERT onboarding_data                  │     │
│  │       Fields: address_line_1, address_line_2,           │     │
│  │               address_country, state, city,             │     │
│  │               zip_code, current_step=8                  │     │
│  │     → Up to 5 retries if schema mismatch                │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  SKIP CLICK:                                                     │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ 12. auth.getUser()                                      │     │
│  │ 13. upsertOnboardingData({ current_step: 8 })           │     │
│  │     → Only saves step number, no address data           │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘

TOTAL BACKEND CALLS ON PAGE LOAD (worst case):
  1. auth.getUser()
  2. SELECT onboarding_data  
  3. SELECT user_financial_data
  4. POST hushh-location-geocode (→ Google Maps API)
  5. UPDATE onboarding_data (GPS background save)
  6. GET get-locations?type=states
  7. GET get-locations?type=cities
  = 7 backend calls minimum

TOTAL ON CONTINUE:
  8. auth.getUser()
  9. SELECT onboarding_data (check exists)
  10. UPDATE onboarding_data (save address)
  = 3 more calls

GRAND TOTAL: ~10 backend calls for one step
```

---

## 11. Backend Bug Summary

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| B1 | Timezone mapping only 13 countries | 🔴 Critical | `hushh-location-geocode` |
| B2 | COUNTRY_DIAL_CODES duplicated in 2 files | 🟡 Medium | frontend + edge function |
| B3 | upsertOnboardingData not atomic (SELECT→UPDATE race) | 🔴 Critical | `upsertOnboardingData.ts` |
| B4 | Missing column auto-drop silently loses data | 🟡 Medium | `upsertOnboardingData.ts` |
| B5 | GPS country stored as name, address as ISO code | 🔴 Critical | `locationService.ts` |
| B6 | Dual V2/Legacy schema confusion | 🟡 Medium | `locationService.ts` |
| B7 | GPS save fire-and-forget (errors swallowed) | 🟡 Medium | `logic.ts` |
| B8 | GPS save uses UPDATE only — fails if row doesn't exist | 🟡 Medium | `locationService.ts` |
| B9 | get-locations is PUBLIC with no rate limiting | 🟡 Medium | `get-locations/index.ts` |
| B10 | Nominatim rate limit not respected in edge function | ⚠️ Low | `hushh-location-geocode` |
| B11 | 10 backend calls for 1 step — could be reduced | ⚠️ Low | Architecture |
