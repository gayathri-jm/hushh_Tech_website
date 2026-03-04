/**
 * Step 4 — Location & Address (Merged KYC Step)
 * GPS detect → full address READ-ONLY + citizenship editable.
 * Uses HushhTechBackHeader + HushhTechCta reusable components.
 */
import {
  useStep4Logic,
  countries,
  CURRENT_STEP,
  TOTAL_STEPS,
  PROGRESS_PCT,
} from "./logic";
import HushhTechBackHeader from "../../../components/hushh-tech-back-header/HushhTechBackHeader";
import HushhTechCta, {
  HushhTechCtaVariant,
} from "../../../components/hushh-tech-cta/HushhTechCta";
import PermissionHelpModal from "../../../components/PermissionHelpModal";

/* Note: HushhTechCta uses children (not label), variant BLACK/WHITE */

export default function OnboardingStep4() {
  const s = useStep4Logic();

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-hushh-blue selection:text-white relative overflow-hidden">
      {/* ═══ Background layer (blurs when location modal open) ═══ */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          s.showLocationModal
            ? "scale-[0.98] blur-[2px] opacity-40 pointer-events-none"
            : ""
        }`}
      >
        {/* Header */}
        <HushhTechBackHeader onBackClick={s.handleBack} rightLabel="FAQs" />

        <main className="px-6 flex-grow max-w-md mx-auto w-full pt-4 pb-32">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-500">
                Step {CURRENT_STEP} of {TOTAL_STEPS}
              </span>
              <span className="text-xs font-semibold text-gray-700">
                {PROGRESS_PCT}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${PROGRESS_PCT}%` }}
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Location & Address
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            We detect your address automatically for KYC verification.
          </p>

          {/* ═══ Detection Status ═══ */}
          {s.locationStatus === "detecting" && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl mb-6 animate-pulse">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-blue-700 font-medium">
                Detecting your location…
              </span>
            </div>
          )}

          {s.locationStatus === "success" && s.address.country && (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl mb-6">
              <span className="text-green-600 text-lg">✅</span>
              <div>
                <p className="text-sm font-semibold text-green-800">
                  Location detected
                </p>
                <p className="text-xs text-green-600 mt-0.5 line-clamp-1">
                  {s.address.fullAddress || `${s.address.city}, ${s.address.state}, ${s.address.country}`}
                </p>
              </div>
            </div>
          )}

          {s.locationStatus === "denied" && (
            <div className="p-4 bg-amber-50 rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <span className="text-amber-600 text-lg">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Location access denied
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Please enable location access for KYC verification.
                  </p>
                </div>
              </div>
              <button
                onClick={() => s.setShowPermissionHelp(true)}
                className="mt-3 text-xs text-amber-700 underline"
              >
                How to enable location access?
              </button>
            </div>
          )}

          {s.locationStatus === "failed" && (
            <div className="p-4 bg-red-50 rounded-xl mb-6">
              <div className="flex items-center gap-3">
                <span className="text-red-600 text-lg">❌</span>
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    Location detection failed
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Please try again or check your device settings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Re-detect button ═══ */}
          {(s.locationStatus === "denied" ||
            s.locationStatus === "failed" ||
            s.locationStatus === "success") && (
            <button
              onClick={s.handleRedetect}
              disabled={s.isDetectingLocation}
              className="w-full mb-6 py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              aria-label="Re-detect location"
            >
              <span>📍</span>
              Re-detect Location
            </button>
          )}

          {/* ═══ Citizenship Dropdown (EDITABLE) ═══ */}
          <div className="mb-6">
            <label
              htmlFor="citizenship"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Citizenship Country
            </label>
            <select
              id="citizenship"
              value={s.citizenshipCountry}
              onChange={(e) => s.handleCitizenshipChange(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              aria-label="Select citizenship country"
            >
              <option value="">Select your citizenship</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* ═══ Detected Address (READ-ONLY) ═══ */}
          {s.address.country && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  Detected Address
                </span>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                  READ-ONLY
                </span>
              </div>

              {/* Address Line 1 */}
              {s.address.addressLine1 && (
                <ReadOnlyField
                  label="Address"
                  value={s.address.addressLine1}
                  icon="🏠"
                />
              )}

              {/* City */}
              {s.address.city && (
                <ReadOnlyField
                  label="City"
                  value={s.address.city}
                  icon="🏙️"
                />
              )}

              {/* State */}
              {s.address.state && (
                <ReadOnlyField
                  label="State / Province"
                  value={s.address.state}
                  icon="📍"
                />
              )}

              {/* Country */}
              <ReadOnlyField
                label="Country"
                value={`${s.address.country}${s.address.countryCode ? ` (${s.address.countryCode})` : ""}`}
                icon="🌍"
              />

              {/* ZIP */}
              {s.address.zipCode && (
                <ReadOnlyField
                  label="ZIP / Postal Code"
                  value={s.address.zipCode}
                  icon="📮"
                />
              )}

              {/* Full address (collapsed) */}
              {s.address.fullAddress && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                    Full Address (Google)
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {s.address.fullAddress}
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ═══ Location Permission Modal ═══ */}
      {s.showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={s.handleDontAllow}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm mx-auto p-6 shadow-2xl animate-slide-up">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📍</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">
                Allow Location Access
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                We need your location to auto-fill your address for KYC verification. Your data is secure and encrypted.
              </p>
              <button
                onClick={s.handleAllowLocation}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-sm mb-3 active:scale-[0.98] transition-transform"
                aria-label="Allow location access"
              >
                Allow Location Access
              </button>
              <button
                onClick={s.handleDontAllow}
                className="w-full py-3 text-gray-500 text-sm font-medium"
                aria-label="Don't allow location access"
              >
                Don't Allow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Permission Help Modal ═══ */}
      <PermissionHelpModal
        isOpen={s.showPermissionHelp}
        onClose={() => s.setShowPermissionHelp(false)}
      />

      {/* ═══ Bottom CTA ═══ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 py-4 z-40">
        <div className="max-w-md mx-auto flex gap-3">
          <HushhTechCta
            variant={HushhTechCtaVariant.WHITE}
            onClick={s.handleSkip}
            className="flex-1"
          >
            Skip
          </HushhTechCta>
          <HushhTechCta
            variant={HushhTechCtaVariant.BLACK}
            onClick={s.handleContinue}
            disabled={!s.canContinue || s.isLoading}
            className="flex-[2]"
          >
            {s.isLoading ? "Saving…" : "Continue"}
          </HushhTechCta>
        </div>
      </div>
    </div>
  );
}

/* ═══ Read-Only Field Component ═══ */
function ReadOnlyField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
      <span className="text-base mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
      </div>
      <span className="text-gray-300 text-xs mt-1 shrink-0">🔒</span>
    </div>
  );
}
