import config from '../../resources/config/config';

/**
 * Upserts onboarding data using SELECT → UPDATE/INSERT pattern.
 * Bypasses PostgREST on_conflict parameter (avoids PGRST204 errors).
 */
export const upsertOnboardingData = async (
  userId: string,
  payload: Record<string, unknown>
): Promise<{ error: { message: string } | null }> => {
  if (!config.supabaseClient) {
    return { error: { message: 'Supabase client not configured' } };
  }

  try {
    // 1. Check if row exists
    const { data: existing, error: selectError } = await config.supabaseClient
      .from('onboarding_data')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (selectError) {
      console.error('[upsertOnboardingData] SELECT error:', selectError);
      return { error: { message: selectError.message } };
    }

    // 2. Update if exists, insert if not
    if (existing) {
      const { error: updateError } = await config.supabaseClient
        .from('onboarding_data')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[upsertOnboardingData] UPDATE error:', updateError);
        return { error: { message: updateError.message } };
      }
    } else {
      const { error: insertError } = await config.supabaseClient
        .from('onboarding_data')
        .insert({ user_id: userId, ...payload });

      if (insertError) {
        console.error('[upsertOnboardingData] INSERT error:', insertError);
        return { error: { message: insertError.message } };
      }
    }

    return { error: null };
  } catch (err) {
    console.error('[upsertOnboardingData] Unexpected error:', err);
    return { error: { message: 'Unexpected error saving onboarding data' } };
  }
};
