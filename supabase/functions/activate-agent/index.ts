import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const action = url.searchParams.get('action') || 'activate';

  if (!token) {
    return new Response(renderPage('❌ Error', 'Missing activation token.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  try {
    // Find agent by token
    const { data: agent, error: findError } = await supabase
      .from('kirkland_agents')
      .select('id, name, city, state, status')
      .eq('activation_token', token)
      .single();

    if (findError || !agent) {
      return new Response(renderPage('❌ Not Found', 'Invalid or expired activation token.'), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (action === 'activate') {
      const { error: updateError } = await supabase
        .from('kirkland_agents')
        .update({
          status: 'active',
          is_closed: false,
          activated_at: new Date().toISOString(),
          activation_token: null,
        })
        .eq('id', agent.id);

      if (updateError) throw updateError;

      return new Response(
        renderPage(
          '✅ Agent Activated!',
          `<strong>${agent.name}</strong> (${agent.city}, ${agent.state}) is now live in the directory.`,
          true
        ),
        { headers: { 'Content-Type': 'text/html' } }
      );
    } else {
      // Reject
      const { error: updateError } = await supabase
        .from('kirkland_agents')
        .update({ status: 'rejected', activation_token: null })
        .eq('id', agent.id);

      if (updateError) throw updateError;

      return new Response(
        renderPage('🚫 Agent Rejected', `<strong>${agent.name}</strong> has been rejected.`),
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(renderPage('❌ Error', message), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
});

function renderPage(title: string, message: string, isSuccess = false): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title} — Hushh Agents</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f9fafb;padding:20px}
    .card{background:white;border-radius:20px;padding:48px;max-width:480px;width:100%;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
    h1{font-size:28px;margin-bottom:12px}p{color:#6b7280;font-size:16px;line-height:1.5}
    .badge{display:inline-block;margin-top:20px;padding:8px 20px;border-radius:99px;font-size:14px;font-weight:600;${isSuccess ? 'background:#ecfdf5;color:#059669' : 'background:#fef2f2;color:#dc2626'}}</style>
  </head><body><div class="card"><h1>${title}</h1><p>${message}</p>
    <div class="badge">${isSuccess ? '🎉 Live on Hushh Agents' : '📋 Action Completed'}</div>
    <p style="margin-top:24px"><a href="https://hushhtech.com/hushh-agents/kirkland" style="color:#2563eb;text-decoration:none;font-weight:600">← Back to Directory</a></p>
  </div></body></html>`;
}
