// asset-report-create — Create or get Plaid asset report
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
    const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
    const PLAID_ENV = Deno.env.get('PLAID_ENV') || 'sandbox';
    const baseUrl = `https://${PLAID_ENV}.plaid.com`;

    // If assetReportToken is provided, get existing report
    if (body.assetReportToken && body.action === 'get') {
      const response = await fetch(`${baseUrl}/asset_report/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          asset_report_token: body.assetReportToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error_code === 'PRODUCT_NOT_READY') {
          return new Response(
            JSON.stringify({ status: 'pending', message: 'Asset report not ready yet' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ error: data.error_message, error_code: data.error_code }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ status: 'complete', data: data.report }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Create new asset report
    const accessToken = body.accessToken || body.access_token;
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'accessToken is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const response = await fetch(`${baseUrl}/asset_report/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID,
        secret: PLAID_SECRET,
        access_tokens: [accessToken],
        days_requested: 60,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.error_message, error_code: data.error_code }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        status: 'pending',
        asset_report_token: data.asset_report_token,
        asset_report_id: data.asset_report_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
