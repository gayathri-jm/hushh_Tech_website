import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GMAIL_USER = Deno.env.get('GMAIL_USER') || 'notifications@hushh.ai';
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') || '';
const ACTIVATE_BASE_URL = 'https://ibsisfnjxeowvdtvgzff.supabase.co/functions/v1/activate-agent';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { agentId, name, email, contact_person, city, state, categories, activationToken } = await req.json();

    const activateUrl = `${ACTIVATE_BASE_URL}?token=${activationToken}&action=activate`;
    const rejectUrl = `${ACTIVATE_BASE_URL}?token=${activationToken}&action=reject`;

    const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb">
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <h1 style="font-size:24px;margin:0 0 8px">🏢 New Agent Onboarding</h1>
        <p style="color:#6b7280;margin:0 0 24px">A new business wants to join the Hushh Agents directory.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#6b7280;width:120px">Business</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Contact</td><td style="padding:8px 0">${contact_person}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Location</td><td style="padding:8px 0">${city}, ${state}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Categories</td><td style="padding:8px 0">${(categories || []).join(', ')}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Agent ID</td><td style="padding:8px 0;font-family:monospace;font-size:12px">${agentId}</td></tr>
        </table>
        <div style="margin-top:32px;text-align:center">
          <a href="${activateUrl}" style="display:inline-block;background:#000;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600;margin-right:12px">✓ Activate Agent</a>
          <a href="${rejectUrl}" style="display:inline-block;background:#ef4444;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:600">✕ Reject</a>
        </div>
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px">Hushh Labs — Agent Onboarding System</p>
    </body></html>`;

    // Send via Resend or fallback to logging
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const recipients = ['ankit@theratehouse.ai', 'manish@theratehouse.ai'];

    if (RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Hushh Agents <notifications@hushh.ai>',
          to: recipients,
          subject: `🏢 New Agent: ${name} (${city}, ${state})`,
          html,
        }),
      });
    } else {
      // Fallback: use Gmail SMTP via edge function or just log
      console.log('📧 Email would be sent to:', recipients.join(', '));
      console.log('Subject:', `New Agent: ${name} (${city}, ${state})`);
      console.log('Activate URL:', activateUrl);
    }

    return new Response(JSON.stringify({ success: true, message: 'Notification sent' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
