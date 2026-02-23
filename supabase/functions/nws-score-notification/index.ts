import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * NWS Score Notification — Sends NDA-style email with Net Worth Intelligence Report
 * Triggered after AI profile generation calculates the NWS score
 */

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const FROM_EMAIL = "Hushh Intelligence <noreply@hushh.ai>";

interface NWSNotificationPayload {
  user_email: string;
  user_name: string;
  nws_score: number;
  nws_tier: string;
  total_cash_balance: number;
  total_investment_value: number;
  num_accounts: number;
  account_types: string[];
  primary_institution: string | null;
  address_city: string | null;
  address_state: string | null;
  identity_verification_score: number | null;
  profile_url?: string;
}

/** NDA-style black & white email template */
function buildEmailHtml(data: NWSNotificationPayload): string {
  const tierColor = data.nws_tier === "Elite" ? "#00C853"
    : data.nws_tier === "Strong" ? "#2979FF"
    : data.nws_tier === "Moderate" ? "#FF9100"
    : "#FF5252";

  const location = [data.address_city, data.address_state].filter(Boolean).join(", ") || "—";
  const accountTypesStr = data.account_types.length > 0 ? data.account_types.join(", ") : "—";
  const profileUrl = data.profile_url || "https://hushh.ai/hushh-user-profile";
  const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- BLACK HEADER -->
        <tr><td style="background-color:#000000;padding:28px 32px;text-align:center;">
          <h1 style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:3px;text-transform:uppercase;">HUSHH</h1>
          <p style="margin:6px 0 0;font-size:11px;color:#999999;letter-spacing:2px;text-transform:uppercase;">Net Worth Intelligence Report</p>
        </td></tr>

        <!-- SCORE HERO -->
        <tr><td style="background-color:#111111;padding:32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:#666666;letter-spacing:1px;text-transform:uppercase;">Your NWS Score</p>
          <p style="margin:0;font-size:56px;font-weight:800;color:#ffffff;line-height:1;">${data.nws_score}</p>
          <p style="margin:8px 0 0;font-size:11px;font-weight:600;color:${tierColor};letter-spacing:1.5px;text-transform:uppercase;">● ${data.nws_tier} Tier</p>
          <p style="margin:16px 0 0;font-size:11px;color:#555555;">out of 100 · calculated ${now}</p>
        </td></tr>

        <!-- WHITE CONTENT -->
        <tr><td style="background-color:#ffffff;padding:32px;">

          <!-- Greeting -->
          <p style="margin:0 0 20px;font-size:15px;color:#000000;line-height:1.6;">
            Dear <strong>${data.user_name}</strong>,
          </p>
          <p style="margin:0 0 24px;font-size:13px;color:#333333;line-height:1.7;">
            Your Net Worth Score has been calculated using verified financial data from your linked bank accounts. This score reflects your overall financial health and investment readiness.
          </p>

          <!-- FINANCIAL SUMMARY TABLE -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #000000;margin-bottom:24px;">
            <tr><td colspan="2" style="background-color:#000000;padding:10px 16px;">
              <p style="margin:0;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:1.5px;text-transform:uppercase;">Financial Summary</p>
            </td></tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;width:50%;">Cash Reserves</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">$${data.total_cash_balance.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;">Investment Holdings</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">$${data.total_investment_value.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;">Total Accounts</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">${data.num_accounts}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;">Account Types</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">${accountTypesStr}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;">Primary Institution</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">${data.primary_institution || "—"}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;border-bottom:1px solid #e5e5e5;">Verified Location</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;border-bottom:1px solid #e5e5e5;text-align:right;">${location}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#666666;">Identity Verification</td>
              <td style="padding:10px 16px;font-size:13px;color:#000000;font-weight:600;text-align:right;">${data.identity_verification_score !== null ? data.identity_verification_score + "%" : "—"}</td>
            </tr>
          </table>

          <!-- CTA BUTTON -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px;">
              <a href="${profileUrl}" target="_blank" style="display:inline-block;background-color:#000000;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;padding:14px 32px;letter-spacing:0.5px;">VIEW YOUR FULL PROFILE</a>
            </td></tr>
          </table>

          <p style="margin:0;font-size:11px;color:#999999;line-height:1.6;">
            This score is generated using verified financial data from your linked bank accounts via Plaid. Your data is encrypted and never shared without your explicit consent. Hushh does not store your bank credentials.
          </p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background-color:#ffffff;border-top:1px solid #e5e5e5;padding:20px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#999999;">© ${new Date().getFullYear()} Hushh Technologies LLC. All rights reserved.</p>
          <p style="margin:4px 0 0;font-size:10px;color:#cccccc;">Your data, your rules. Privacy-first intelligence.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const payload: NWSNotificationPayload = await req.json();

    if (!payload.user_email || !payload.user_name) {
      return new Response(JSON.stringify({ error: "Missing user_email or user_name" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const emailHtml = buildEmailHtml(payload);

    // Send via Resend API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [payload.user_email],
        subject: `Your Net Worth Score: ${payload.nws_score}/100 — ${payload.nws_tier} Tier`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendData }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ success: true, email_id: resendData.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("NWS notification error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
