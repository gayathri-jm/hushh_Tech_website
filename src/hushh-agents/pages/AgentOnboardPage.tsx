import { useAgentOnboard } from '../hooks/useAgentOnboard';
import { useNavigate } from 'react-router-dom';

const CATEGORY_OPTIONS = [
  'Insurance', 'Real Estate', 'Legal Services', 'Financial Planning',
  'Auto Repair', 'Medical', 'Dental', 'Restaurants', 'Retail',
  'Home Services', 'Pet Services', 'Fitness', 'Beauty & Spa',
  'Technology', 'Education', 'Consulting', 'Notaries', 'Other',
];

const US_STATES = ['WA', 'CA', 'NY', 'TX', 'FL', 'IL', 'OR', 'AZ', 'CO', 'GA'];

export const AgentOnboardPage = () => {
  const nav = useNavigate();
  const {
    form, step, totalSteps, progress,
    isSubmitting, isSuccess, error,
    updateField, handleNext, handleBack, handleSubmit,
  } = useAgentOnboard();

  // Success screen
  if (isSuccess) {
    return (
      <div className="bg-white text-gray-900 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl animate-bounce">🎉</div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
            Application Submitted!
          </h1>
          <p className="text-gray-600 text-lg">
            Your business listing is under review. We'll notify you at{' '}
            <span className="font-semibold text-black">{form.email}</span> within 24 hours.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-800 text-sm">
            ✓ Our team will review your application and activate your listing.
          </div>
          <button
            onClick={() => nav('/hushh-agents/kirkland')}
            className="w-full h-14 bg-black text-white rounded-2xl font-semibold text-base active:scale-[0.98] transition-transform"
          >
            Back to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-gray-900 min-h-screen antialiased flex flex-col selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md z-40 border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => step > 1 ? handleBack() : nav(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 active:scale-95"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <h2 className="text-sm font-semibold text-gray-800">List Your Business</h2>
          <div className="w-10" />
        </div>
      </header>

      <main className="px-6 flex-grow max-w-md mx-auto w-full pb-48">
        {/* Progress Bar */}
        <div className="mt-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Step {step} of {totalSteps}</span>
            <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step 1: Business Identity */}
        {step === 1 && (
          <section className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                Business Identity
              </h1>
              <p className="text-gray-500 text-sm">Tell us about your business</p>
            </div>
            <Field label="Business Name *" value={form.name} onChange={(v) => updateField('name', v)} placeholder="e.g. ABC Insurance Services" />
            <Field label="Contact Person *" value={form.contact_person} onChange={(v) => updateField('contact_person', v)} placeholder="Full name" />
            <Field label="Email Address *" value={form.email} onChange={(v) => updateField('email', v)} placeholder="you@business.com" type="email" />
          </section>
        )}

        {/* Step 2: Business Details */}
        {step === 2 && (
          <section className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                Business Details
              </h1>
              <p className="text-gray-500 text-sm">What services do you offer?</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categories *</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      const cats = form.categories.includes(cat)
                        ? form.categories.filter((c) => c !== cat)
                        : [...form.categories, cat];
                      updateField('categories', cats);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.categories.includes(cat)
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Bio / Description" value={form.bio} onChange={(v) => updateField('bio', v)} placeholder="Brief description of your business" multiline />
            <Field label="License Number" value={form.license_number} onChange={(v) => updateField('license_number', v)} placeholder="Optional" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years in Business</label>
              <input
                type="number"
                min={0}
                value={form.years_in_business ?? ''}
                onChange={(e) => updateField('years_in_business', e.target.value ? Number(e.target.value) : null)}
                className="w-full h-12 px-4 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. 5"
              />
            </div>
          </section>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <section className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                Location
              </h1>
              <p className="text-gray-500 text-sm">Where is your business located?</p>
            </div>
            <Field label="Street Address" value={form.address1} onChange={(v) => updateField('address1', v)} placeholder="123 Main St" />
            <Field label="City *" value={form.city} onChange={(v) => updateField('city', v)} placeholder="e.g. Kirkland" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <select
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Field label="ZIP Code" value={form.zip} onChange={(v) => updateField('zip', v)} placeholder="98034" />
          </section>
        )}

        {/* Step 4: Contact Info */}
        {step === 4 && (
          <section className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                Contact Info
              </h1>
              <p className="text-gray-500 text-sm">How can customers reach you?</p>
            </div>
            <Field label="Phone Number *" value={form.phone} onChange={(v) => updateField('phone', v)} placeholder="+1 (425) 555-0100" type="tel" />
            <Field label="Website" value={form.website} onChange={(v) => updateField('website', v)} placeholder="https://yourbusiness.com" type="url" />
            <Field label="Photo URL" value={form.photo_url} onChange={(v) => updateField('photo_url', v)} placeholder="Link to business photo" type="url" />
          </section>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <section className="space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                Review & Submit
              </h1>
              <p className="text-gray-500 text-sm">Confirm your details</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm">
              <ReviewRow label="Business" value={form.name} />
              <ReviewRow label="Contact" value={form.contact_person} />
              <ReviewRow label="Email" value={form.email} />
              <ReviewRow label="Phone" value={form.phone} />
              <ReviewRow label="Categories" value={form.categories.join(', ')} />
              <ReviewRow label="Location" value={`${form.city}, ${form.state} ${form.zip}`} />
              {form.website && <ReviewRow label="Website" value={form.website} />}
              {form.bio && <ReviewRow label="Bio" value={form.bio} />}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-blue-800 text-sm">
              📋 By submitting, you agree to our terms. Your listing will be reviewed and activated by our team.
            </div>
          </section>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
            {error}
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-6 py-4 pb-8">
        <div className="max-w-md mx-auto">
          {step < totalSteps ? (
            <button
              onClick={handleNext}
              className="w-full h-14 bg-black text-white rounded-2xl font-semibold text-base active:scale-[0.98] transition-transform shadow-lg"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-14 bg-black text-white rounded-2xl font-semibold text-base active:scale-[0.98] transition-transform shadow-lg disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* Reusable Field component */
const Field = ({ label, value, onChange, placeholder = '', type = 'text', multiline = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; multiline?: boolean;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {multiline ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 px-4 rounded-xl border border-gray-300 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    )}
  </div>
);

/* Review row for summary */
const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-900 text-right max-w-[60%]">{value || '—'}</span>
  </div>
);

export default AgentOnboardPage;
