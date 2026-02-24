/**
 * Step 1 — Fund A Allocation Tier
 * Matches the refined HTML design. Logic stays in logic.ts.
 * Uses HushhTechBackHeader + HushhTechCta reusable components.
 */
import {
  useStep1Logic,
  SHARE_CLASSES,
  TOTAL_STEPS,
  FREQ_OPTIONS,
  AMOUNT_PRESETS,
  formatCurrency,
} from "./logic";
import HushhTechBackHeader from "../../../components/hushh-tech-back-header/HushhTechBackHeader";
import HushhTechCta, {
  HushhTechCtaVariant,
} from "../../../components/hushh-tech-cta/HushhTechCta";

/** Icons for each share class */
const CLASS_ICONS: Record<string, string> = {
  class_a: "account_balance_wallet",
  class_b: "account_balance",
  class_c: "savings",
};

/** Tier descriptions */
const TIER_LABELS: Record<string, string> = {
  ultra: "ultra high net worth",
  premium: "high net worth",
  standard: "accredited investor",
};

/** Day options for investment */
const DAY_OPTIONS = [
  { value: "1st of the month", label: "1st of month" },
  { value: "15th of the month", label: "15th of month" },
  { value: "Last day of the month", label: "Last day" },
];

const CURRENT_STEP = 1;
const PROGRESS_PCT = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100);

export default function OnboardingStep1() {
  const {
    units,
    frequency,
    investmentDay,
    selectedAmount,
    customAmount,
    customAmountError,
    error,
    isLoading,
    hasSelection,
    handleUnitChange,
    handleAmountClick,
    handleCustomAmountChange,
    setFrequency,
    setInvestmentDay,
    handleNext,
    handleBack,
  } = useStep1Logic();

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-black selection:text-white">
      {/* ═══ Header ═══ */}
      <HushhTechBackHeader onBackClick={handleBack} rightLabel="FAQs" />

      <main className="px-6 flex-grow max-w-md mx-auto w-full pb-48">
        {/* ── Progress Bar ── */}
        <div className="py-4">
          <div className="flex justify-between text-[11px] font-semibold tracking-wide text-gray-500 mb-3 lowercase">
            <span>step {CURRENT_STEP}/{TOTAL_STEPS}</span>
            <span>{PROGRESS_PCT}% complete</span>
          </div>
          <div className="h-0.5 w-full bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-500"
              style={{ width: `${PROGRESS_PCT}%` }}
            />
          </div>
        </div>

        {/* ── Title Section ── */}
        <section className="py-8">
          <h3 className="text-[11px] tracking-wide text-gray-500 lowercase mb-4 font-semibold">
            institutional series
          </h3>
          <h1
            className="text-[2.75rem] leading-[1.1] font-normal text-black tracking-tight lowercase"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            hushh fund a <br />
            <span className="text-gray-400 font-normal">
              multi-strategy alpha
            </span>
          </h1>
        </section>

        {/* ── Share Class Rows ── */}
        <section className="mt-4 mb-12 space-y-2">
          {SHARE_CLASSES.map((sc) => {
            const count = units[sc.id] || 0;
            const isActive = count > 0;
            return (
              <div
                key={sc.id}
                className="group py-5 border-b border-gray-200 flex items-center justify-between"
              >
                {/* Left: icon + name + tier */}
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center shrink-0 ${
                      isActive ? "bg-gray-100" : "bg-gray-50"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-gray-600 text-xl"
                      style={{ fontVariationSettings: "'wght' 400" }}
                    >
                      {CLASS_ICONS[sc.id] || "wallet"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h2 className="text-base font-semibold text-gray-900 lowercase">
                        {sc.name.toLowerCase()}
                      </h2>
                      {sc.id === "class_a" && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-semibold lowercase rounded-sm">
                          recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 lowercase leading-relaxed font-medium">
                      {TIER_LABELS[sc.tier] || sc.description}
                    </p>
                  </div>
                </div>

                {/* Right: price + stepper */}
                <div className="flex flex-col items-end gap-1">
                  <div className="text-right mb-1">
                    <span
                      className={`text-sm font-sans ${
                        isActive ? "text-black font-bold" : "text-gray-700 font-semibold"
                      }`}
                    >
                      {sc.displayPrice}
                    </span>{" "}
                    <span className="text-[10px] text-gray-500 lowercase">
                      /unit
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-3 rounded-full px-2 py-1 ${
                      isActive
                        ? "bg-gray-100"
                        : "opacity-50 group-hover:opacity-100 transition-opacity"
                    }`}
                  >
                    <button
                      onClick={() => handleUnitChange(sc.id, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-gray-600 hover:text-black hover:bg-gray-200 transition"
                      aria-label={`Decrease ${sc.name}`}
                    >
                      <span className="material-symbols-outlined text-base">
                        remove
                      </span>
                    </button>
                    <span
                      className={`font-mono text-sm w-4 text-center font-semibold ${
                        isActive ? "text-black" : "text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                    <button
                      onClick={() => handleUnitChange(sc.id, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-gray-900 hover:bg-gray-200 transition"
                      aria-label={`Increase ${sc.name}`}
                    >
                      <span className="material-symbols-outlined text-base">
                        add
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ── Recurring Investment ── */}
        <section className="mb-32">
          <div className="flex items-center justify-between mb-8">
            <h3
              className="text-xl text-black lowercase font-normal"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              recurring investment
            </h3>
            <div className="relative inline-block w-10 align-middle select-none transition duration-200 ease-in">
              <input
                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-black transition-all duration-300"
                id="recurring-toggle"
                type="checkbox"
                defaultChecked
              />
              <label
                className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-200 cursor-pointer transition-colors duration-300"
                htmlFor="recurring-toggle"
              />
            </div>
          </div>

          <div className="space-y-0">
            {/* ── Frequency: selectable pills ── */}
            <div className="py-5 border-b border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-gray-700 text-lg"
                    style={{ fontVariationSettings: "'wght' 400" }}
                  >
                    calendar_today
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 lowercase mb-0.5">
                    frequency
                  </p>
                  <p className="text-xs text-gray-500 lowercase font-medium">
                    choose payment schedule
                  </p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pl-14">
                {FREQ_OPTIONS.map((opt) => {
                  const isSelected = frequency === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setFrequency(opt.value)}
                      className={`flex-shrink-0 px-4 py-2.5 text-xs font-medium transition whitespace-nowrap lowercase border ${
                        isSelected
                          ? "bg-black text-white border-black shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label.toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Day: selectable pills ── */}
            <div className="py-5 border-b border-gray-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-gray-700 text-lg"
                    style={{ fontVariationSettings: "'wght' 400" }}
                  >
                    schedule
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 lowercase mb-0.5">
                    day
                  </p>
                  <p className="text-xs text-gray-500 lowercase font-medium">
                    select debit date
                  </p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pl-14">
                {DAY_OPTIONS.map((opt) => {
                  const isSelected = investmentDay === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setInvestmentDay(opt.value)}
                      className={`flex-shrink-0 px-4 py-2.5 text-xs font-medium transition whitespace-nowrap lowercase border ${
                        isSelected
                          ? "bg-black text-white border-black shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {opt.label.toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Amount: selectable pills ── */}
            <div className="py-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-gray-700 text-lg"
                    style={{ fontVariationSettings: "'wght' 400" }}
                  >
                    payments
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 lowercase mb-0.5">
                    amount
                  </p>
                  <p className="text-xs text-gray-500 lowercase font-medium">
                    investment per cycle
                  </p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pl-14">
                {AMOUNT_PRESETS.map((amt) => {
                  const isSelected = selectedAmount === amt;
                  return (
                    <button
                      key={amt}
                      onClick={() => handleAmountClick(amt)}
                      className={`flex-shrink-0 px-5 py-2.5 text-xs font-mono font-medium transition whitespace-nowrap lowercase border ${
                        isSelected
                          ? "bg-black text-white border-black shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {formatCurrency(amt)}
                    </button>
                  );
                })}
              </div>

              {/* Custom amount input */}
              <div className="pl-14 mt-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                    $
                  </span>
                  <input
                    type="text"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="Custom amount"
                    className="w-full pl-7 pr-4 py-3 bg-gray-50 border border-gray-200 text-sm font-mono text-gray-900 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-black focus:border-black transition lowercase"
                  />
                </div>
                {customAmountError && (
                  <p className="text-xs text-red-600 mt-1 font-medium">{customAmountError}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Error message ── */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* ── CTAs — Continue & Skip ── */}
        <section className="pb-12 space-y-3">
          <HushhTechCta
            variant={HushhTechCtaVariant.BLACK}
            onClick={handleNext}
            disabled={!hasSelection || isLoading}
          >
            {isLoading ? "Saving..." : "Continue"}
          </HushhTechCta>

          <HushhTechCta
            variant={HushhTechCtaVariant.WHITE}
            onClick={handleBack}
          >
            Skip
          </HushhTechCta>
        </section>

        {/* ── Trust Badges ── */}
        <section className="flex flex-col items-center justify-center text-center gap-2 pb-8">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-gray-600">
                lock
              </span>
              <span className="text-[10px] text-gray-600 tracking-wide uppercase font-medium">
                256 bit encryption
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
