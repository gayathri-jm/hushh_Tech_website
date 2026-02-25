/**
 * Home Page — UI / Presentation
 * Matches the "Hushh Unified Premium Home" design.
 * Uses reusable: HushhTechHeader, HushhTechFooter, HushhTechCta.
 * Logic stays in logic.ts — zero changes there.
 */
import { useHomeLogic } from "./logic";
import HushhTechHeader from "../../components/hushh-tech-header/HushhTechHeader";
import HushhTechFooter, {
  HushhFooterTab,
} from "../../components/hushh-tech-footer/HushhTechFooter";
import HushhTechCta, {
  HushhTechCtaVariant,
} from "../../components/hushh-tech-cta/HushhTechCta";

export default function HomePage() {
  const { session, primaryCTA, onNavigate } = useHomeLogic();

  return (
    <div
      data-page="home"
      className="bg-white font-sans antialiased text-black min-h-screen flex flex-col relative"
    >
      {/* ═══ Header ═══ */}
      <HushhTechHeader
        fixed={false}
        className="sticky top-0 z-50 border-b border-transparent"
      />

      {/* ═══ Main Content ═══ */}
      <main className="flex-1 px-6 pb-32 flex flex-col gap-12 pt-4">

        {/* ── Hero ── */}
        <section className="flex flex-col gap-4">
          <h1 className="font-display text-5xl md:text-6xl font-bold leading-[1.1]">
            Investing in <br /> the{" "}
            <span className="text-hushh-blue italic pr-2">future.</span>
          </h1>
          <p className="text-hushh-text-muted text-lg leading-relaxed max-w-sm mt-2 font-light">
            The world's first AI-powered Berkshire Hathaway. Merging rigorous
            data science with human wisdom.
          </p>
        </section>

        {/* ── Feature Cards (AI-Powered / Human-Led) ── */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-5 rounded-[20px] border border-gray-100 flex flex-col justify-between min-h-[180px]">
            <span className="material-symbols-outlined thin-icon text-3xl mb-4 text-hushh-blue">
              neurology
            </span>
            <div>
              <h3 className="font-display text-lg font-bold mb-1">AI-Powered</h3>
              <p className="text-xs text-hushh-text-muted leading-relaxed">
                Institutional analytics processing millions of signals.
              </p>
            </div>
          </div>
          <div className="bg-gray-50 p-5 rounded-[20px] border border-gray-100 flex flex-col justify-between min-h-[180px]">
            <span className="material-symbols-outlined thin-icon text-3xl mb-4 text-black">
              supervised_user_circle
            </span>
            <div>
              <h3 className="font-display text-lg font-bold mb-1">Human-Led</h3>
              <p className="text-xs text-hushh-text-muted leading-relaxed">
                Seasoned oversight ensuring long-term strategic vision.
              </p>
            </div>
          </div>
        </section>

        {/* ── Primary CTAs ── */}
        <section className="flex flex-col gap-3">
          <HushhTechCta
            onClick={primaryCTA.action}
            disabled={primaryCTA.loading}
            variant={HushhTechCtaVariant.BLACK}
            className="rounded-2xl"
          >
            {primaryCTA.text}
            <span className="material-symbols-outlined thin-icon text-lg">arrow_forward</span>
          </HushhTechCta>
          <HushhTechCta
            onClick={() => onNavigate("/fund-a")}
            variant={HushhTechCtaVariant.WHITE}
            className="rounded-2xl"
          >
            Discover Fund A
          </HushhTechCta>
        </section>

        {/* ── Trust Badges ── */}
        <section className="flex justify-center items-center gap-6 py-2 opacity-60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined thin-icon text-lg">
              verified_user
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-hushh-text-muted">
              SEC Registered
            </span>
          </div>
          <div className="w-1 h-1 bg-gray-300 rounded-full" />
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined thin-icon text-lg">
              lock
            </span>
            <span className="text-[10px] font-bold tracking-widest uppercase text-hushh-text-muted">
              Bank Level Security
            </span>
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="border-t border-gray-100 my-2" />

        {/* ── The Hushh Advantage ── */}
        <section>
          <h2 className="font-display text-2xl font-bold mb-8 text-center">
            The Hushh Advantage
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10">
            {/* Data Driven */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center bg-white">
                <span className="material-symbols-outlined thin-icon">analytics</span>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">Data Driven</h4>
                <p className="text-[11px] text-hushh-text-muted max-w-[120px] mx-auto">
                  Decisions based on facts, not emotions.
                </p>
              </div>
            </div>
            {/* Low Fees */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center bg-white">
                <span className="material-symbols-outlined thin-icon">savings</span>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">Low Fees</h4>
                <p className="text-[11px] text-hushh-text-muted max-w-[120px] mx-auto">
                  More of your returns stay in your pocket.
                </p>
              </div>
            </div>
            {/* Expert Vetted */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center bg-white">
                <span className="material-symbols-outlined thin-icon">workspace_premium</span>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">Expert Vetted</h4>
                <p className="text-[11px] text-hushh-text-muted max-w-[120px] mx-auto">
                  Top-tier financial minds at work.
                </p>
              </div>
            </div>
            {/* Automated */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center bg-white">
                <span className="material-symbols-outlined thin-icon">autorenew</span>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-1">Automated</h4>
                <p className="text-[11px] text-hushh-text-muted max-w-[120px] mx-auto">
                  Set it and forget it peace of mind.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Fund A Card ── */}
        <section className="relative mt-4">
          <div className="bg-black text-white p-8 rounded-[24px] relative overflow-hidden shadow-2xl">
            {/* Glow effects */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-hushh-blue/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-hushh-blue/10 to-transparent" />

            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold tracking-widest uppercase text-white/60 mb-1 block">
                    Flagship Product
                  </span>
                  <h2 className="font-display text-3xl font-bold">Fund A</h2>
                </div>
                <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10">
                  High Growth
                </span>
              </div>

              <div className="space-y-4 my-2">
                <div>
                  <span className="text-sm text-white/60 block mb-1">Target Net IRR</span>
                  <span className="text-4xl font-mono font-light tracking-tighter">
                    18-23%
                  </span>
                </div>
                <div>
                  <span className="text-sm text-white/60 block mb-1">Inception Year</span>
                  <span className="font-mono text-xl">2024</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between group cursor-pointer">
                <span className="text-xs font-medium tracking-wide uppercase">
                  Performance details
                </span>
                <span className="material-symbols-outlined thin-icon text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature Grid ── */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <span className="material-symbols-outlined thin-icon text-hushh-blue mb-2">
                rocket_launch
              </span>
              <h5 className="font-bold text-sm">High Growth</h5>
              <p className="text-[10px] text-hushh-text-muted">
                Accelerated returns strategy
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <span className="material-symbols-outlined thin-icon text-amber-600 mb-2">
                pie_chart
              </span>
              <h5 className="font-bold text-sm">Diversified</h5>
              <p className="text-[10px] text-hushh-text-muted">
                Multi-sector allocation
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <span className="material-symbols-outlined thin-icon text-emerald-600 mb-2">
                trending_up
              </span>
              <h5 className="font-bold text-sm">Liquid</h5>
              <p className="text-[10px] text-hushh-text-muted">
                Quarterly redemption windows
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <span className="material-symbols-outlined thin-icon text-purple-600 mb-2">
                security
              </span>
              <h5 className="font-bold text-sm">Secure</h5>
              <p className="text-[10px] text-hushh-text-muted">
                Regulated custodian assets
              </p>
            </div>
          </div>
        </section>

        {/* ── Bottom CTAs ── */}
        <section className="flex flex-col gap-3 py-6">
          <HushhTechCta
            onClick={() => onNavigate("/approach")}
            variant={HushhTechCtaVariant.BLACK}
            className="rounded-2xl"
          >
            Explore our Approach
            <span className="material-symbols-outlined thin-icon text-lg">arrow_right_alt</span>
          </HushhTechCta>
          <HushhTechCta
            onClick={() => onNavigate("/learn")}
            variant={HushhTechCtaVariant.WHITE}
            className="rounded-2xl"
          >
            Learn More
          </HushhTechCta>
        </section>

        {/* ── Disclaimer ── */}
        <footer className="mb-8">
          <p className="text-[10px] text-gray-400 text-center leading-relaxed font-serif italic max-w-xs mx-auto">
            Investing involves risk, including possible loss of principal. Past
            performance does not guarantee future results. Hushh Technologies is
            an SEC registered investment advisor.
          </p>
        </footer>
      </main>

      {/* ═══ Footer Nav ═══ */}
      <HushhTechFooter
        activeTab={HushhFooterTab.HOME}
        onTabChange={(tab) => {
          if (tab === HushhFooterTab.HOME) onNavigate("/");
          if (tab === HushhFooterTab.FUND_A) onNavigate("/discover-fund-a");
          if (tab === HushhFooterTab.COMMUNITY) onNavigate("/community");
          if (tab === HushhFooterTab.PROFILE) onNavigate("/profile");
        }}
      />
    </div>
  );
}
