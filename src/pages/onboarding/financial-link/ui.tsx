/**
 * FinancialLink — UI / Presentation
 * Ditto match of the provided HTML design.
 * Uses HushhTechCta for CONTINUE/SKIP buttons.
 * Logic stays in logic.ts — zero changes there.
 */
import { useNavigate } from "react-router-dom";
import { useFinancialLinkLogic } from "./logic";
import HushhTechCta, {
  HushhTechCtaVariant,
} from "../../../components/hushh-tech-cta/HushhTechCta";
import HushhTechBackHeader from "../../../components/hushh-tech-back-header/HushhTechBackHeader";

/** Verification row data */
const VERIFICATION_ROWS = [
  {
    icon: "account_balance_wallet",
    title: "assets",
    subtitle: "not available",
  },
  {
    icon: "monitoring",
    title: "investments",
    subtitle: "no investment accounts",
  },
  {
    icon: "badge",
    title: "identity",
    subtitle: "not available",
  },
];

export default function OnboardingFinancialLink() {
  const navigate = useNavigate();
  const { userId, isReady, handleContinue, handleSkip } =
    useFinancialLinkLogic();

  /* Loading state */
  if (!isReady || !userId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 text-center">
            Preparing your secure onboarding...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-black selection:text-white">
      {/* Header — back + FAQs */}
      <HushhTechBackHeader
        onBackClick={() => navigate(-1)}
        rightLabel="FAQs"
      />

      {/* Main Content */}
      <main className="px-6 mt-8 flex-grow max-w-md mx-auto w-full">
        {/* Title Section */}
        <section className="space-y-6 mb-16">
          <h2
            className="text-[36px] leading-[1.2] text-gray-900"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            verify your
            <br />
            financial profile.
          </h2>
          <p className="text-gray-400 text-[14px] leading-relaxed max-w-[90%] font-light lowercase">
            we'll securely check your financial profile before starting kyc
            verification to ensure compliance.
          </p>
        </section>

        {/* Verification Rows */}
        <section className="space-y-0 border-t border-gray-100">
          {VERIFICATION_ROWS.map((row) => (
            <div
              key={row.title}
              className="group py-6 border-b border-gray-100 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-gray-800 text-[20px]"
                    style={{
                      fontVariationSettings: "'wght' 200",
                    }}
                  >
                    {row.icon}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 text-[15px] lowercase">
                    {row.title}
                  </span>
                  <span className="text-[13px] text-gray-400 font-light lowercase">
                    {row.subtitle}
                  </span>
                </div>
              </div>
              <span
                className="material-symbols-outlined text-gray-400 text-[20px] group-hover:translate-x-1 transition-transform"
                style={{ fontVariationSettings: "'wght' 200" }}
              >
                east
              </span>
            </div>
          ))}
        </section>

        {/* Trust Badges */}
        <section className="mt-auto py-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="flex items-center gap-3 opacity-60">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">
              PCI DSS
            </span>
            <span className="text-[10px] text-gray-400 lowercase">
              256 bit encryption
            </span>
            <div className="flex items-center gap-2 pl-2 border-l border-gray-300">
              <div className="flex -space-x-1">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              </div>
              <span className="text-[10px] font-bold text-blue-800 italic font-serif">
                Visa
              </span>
              <span className="text-[10px] font-bold text-teal-600">
                RuPay
              </span>
            </div>
          </div>
        </section>

        {/* CTAs — Continue & Skip */}
        <section className="pb-12 space-y-3">
          <HushhTechCta
            variant={HushhTechCtaVariant.BLACK}
            onClick={() =>
              handleContinue({
                verified: false,
                productsAvailable: 0,
                balanceAvailable: false,
                assetsAvailable: false,
                investmentsAvailable: false,
                timestamp: new Date().toISOString(),
              })
            }
          >
            Continue
          </HushhTechCta>

          <HushhTechCta
            variant={HushhTechCtaVariant.WHITE}
            onClick={handleSkip}
          >
            Skip
          </HushhTechCta>
        </section>
      </main>
    </div>
  );
}
