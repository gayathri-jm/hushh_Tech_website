import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://ibsisfnjxeowvdtvgzff.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export interface AgentOnboardForm {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  categories: string[];
  services: string[];
  bio: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  license_number: string;
  years_in_business: number | null;
  photo_url: string;
}

const INITIAL_FORM: AgentOnboardForm = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  categories: [],
  services: [],
  bio: '',
  address1: '',
  city: '',
  state: 'WA',
  zip: '',
  website: '',
  license_number: '',
  years_in_business: null,
  photo_url: '',
};

const SUPABASE_URL = 'https://ibsisfnjxeowvdtvgzff.supabase.co';

export const useAgentOnboard = () => {
  const [form, setForm] = useState<AgentOnboardForm>(INITIAL_FORM);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 5;

  const updateField = (field: keyof AgentOnboardForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep = (s: number): boolean => {
    switch (s) {
      case 1:
        if (!form.name.trim()) { setError('Business name is required'); return false; }
        if (!form.contact_person.trim()) { setError('Contact person is required'); return false; }
        if (!form.email.trim() || !form.email.includes('@')) { setError('Valid email is required'); return false; }
        return true;
      case 2:
        if (form.categories.length === 0) { setError('Select at least one category'); return false; }
        return true;
      case 3:
        if (!form.city.trim()) { setError('City is required'); return false; }
        if (!form.state.trim()) { setError('State is required'); return false; }
        return true;
      case 4:
        if (!form.phone.trim()) { setError('Phone number is required'); return false; }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, totalSteps));
    }
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Generate unique ID and activation token
      const agentId = `onboard_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const activationToken = crypto.randomUUID();

      // Insert into kirkland_agents
      const { error: insertError } = await supabase.from('kirkland_agents').insert({
        id: agentId,
        name: form.name,
        contact_person: form.contact_person,
        email: form.email,
        phone: form.phone,
        categories: form.categories,
        services: form.services,
        bio: form.bio,
        address1: form.address1,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: 'US',
        website: form.website,
        license_number: form.license_number,
        years_in_business: form.years_in_business,
        photo_url: form.photo_url,
        status: 'pending',
        is_closed: false,
        activation_token: activationToken,
        onboarded_at: new Date().toISOString(),
      });

      if (insertError) throw new Error(insertError.message);

      // Send notification email via Edge Function
      await fetch(`${SUPABASE_URL}/functions/v1/agent-onboard-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          name: form.name,
          email: form.email,
          contact_person: form.contact_person,
          city: form.city,
          state: form.state,
          categories: form.categories,
          activationToken,
        }),
      });

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (step / totalSteps) * 100;

  return {
    form, step, totalSteps, progress,
    isSubmitting, isSuccess, error,
    updateField, handleNext, handleBack, handleSubmit,
  };
};
