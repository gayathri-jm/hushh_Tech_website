// Shadow Investigator API - Supabase Edge Function
// Uses Gemini 3 Pro Preview with Google Search grounding and deep thinking
// Performs comprehensive profile enrichment via OSINT techniques

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Vertex AI Configuration
const PROJECT_ID = Deno.env.get("GCP_PROJECT_ID") || "hushone-app";
const MODEL_ID = "gemini-3-pro-preview"; // Gemini 3 Pro Preview for deep reasoning
const VERTEX_AI_LOCATION = "global"; // Using global location for latest model availability

// ============ Types ============

interface SearchParams {
  name: string;
  country?: string;
  email: string;
  contact: string; // Phone number with country code
  age?: number; // Verified age from DOB - boosts confidence
  dateOfBirth?: string; // YYYY-MM-DD format
}

interface Associate {
  name: string;
  relation: string;
  strength: number;
  category: 'INNER' | 'ORBIT' | 'MEDIA' | 'RIVAL';
}

interface NewsItem {
  date: string;
  source: string;
  title: string;
  summary: string;
}

interface StructuredData {
  age: string;
  ageContext: string;
  gender: string;
  dob: string;
  occupation: string;
  nationality: string;
  address: string;
  contact: string;
  maritalStatus: string;
  children: string[];
  knownFor: string[];
  confidence: number;
  netWorthScore: number;
  netWorthContext: string;
  diet: string;
  foods: string[];
  hobbies: string[];
  brands: string[];
  associates: Associate[];
  colors: string[];
  likes: string[];
  dislikes: string[];
  allergies: string[];
  hotelPreferences: string[];
  coffeePreferences: string[];
  drinkPreferences: string[];
  smokePreferences: string;
  chaiPreferences: string[];
  spiciness: string;
  healthInsurance: string[];
  agentPreferences: string[];
  aiPreferences: string[];
  socialMedia: { platform: string; url: string }[];
  news: NewsItem[];
}

interface GroundingSource {
  title: string;
  uri: string;
}

interface ProfileResult {
  structured: StructuredData;
  biography: string;
  sources: GroundingSource[];
}

// ============ OAuth Token Generation ============

const getAccessToken = async (): Promise<string> => {
  // PRIORITY 1: Always try to generate fresh token from service account (never expires)
  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") || 
                              Deno.env.get("GCP_SERVICE_ACCOUNT_KEY") || 
                              Deno.env.get("GCP_SERVICE_ACCOUNT_JSON");
  
  if (serviceAccountJson) {
    try {
      console.log("Generating access token from service account...");
      const sa = JSON.parse(serviceAccountJson);

      if (!sa.private_key || !sa.client_email) {
        throw new Error("Service account JSON missing private_key or client_email");
      }

      const now = Math.floor(Date.now() / 1000);
      const header = { alg: "RS256", typ: "JWT" };
      const payload = {
        iss: sa.client_email,
        sub: sa.client_email,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600
      };

      const encoder = new TextEncoder();
      const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const unsignedJwt = `${headerB64}.${payloadB64}`;

      let privateKeyPem = sa.private_key;
      if (!privateKeyPem.includes('\n') && privateKeyPem.includes('\\n')) {
        privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');
      }

      const pemHeader = "-----BEGIN PRIVATE KEY-----";
      const pemFooter = "-----END PRIVATE KEY-----";
      const startIdx = privateKeyPem.indexOf(pemHeader);
      const endIdx = privateKeyPem.indexOf(pemFooter);

      if (startIdx === -1 || endIdx === -1) {
        throw new Error("Invalid PEM format: missing headers");
      }

      const pemBody = privateKeyPem
        .substring(startIdx + pemHeader.length, endIdx)
        .replace(/[\r\n\s]/g, '');

      const binaryString = atob(pemBody);
      const binaryKey = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binaryKey[i] = binaryString.charCodeAt(i);
      }

      const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey.buffer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        encoder.encode(unsignedJwt)
      );

      const signatureArray = new Uint8Array(signature);
      let signatureB64 = '';
      for (let i = 0; i < signatureArray.length; i++) {
        signatureB64 += String.fromCharCode(signatureArray[i]);
      }
      signatureB64 = btoa(signatureB64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

      const signedJwt = `${unsignedJwt}.${signatureB64}`;

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        throw new Error(`Token exchange failed: ${tokenData.error} - ${tokenData.error_description}`);
      }

      if (tokenData.access_token) {
        console.log("Successfully obtained OAuth access token");
        return tokenData.access_token;
      }

      throw new Error("Token response missing access_token field");
    } catch (e) {
      console.error("Failed to get access token:", e);
      throw e;
    }
  }

  throw new Error("No valid GCP access token found");
};

// ============ Gravatar Fetching ============

const md5 = async (str: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => null);
  
  // Fallback: simple hash if MD5 not available (Deno secure context)
  if (!hashBuffer) {
    // Use a simple hash approximation
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(32, '0');
  }
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const fetchGravatarData = async (email: string): Promise<any> => {
  try {
    const hash = await md5(email.trim().toLowerCase());
    const gravatarUrl = `https://en.gravatar.com/${hash}.json`;

    const response = await fetch(gravatarUrl, {
      headers: { 'User-Agent': 'HushhShadowInvestigator/1.0' }
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.entry?.[0] || null;
  } catch (e) {
    console.warn("Gravatar fetch failed:", e);
    return null;
  }
};

// ============ URL Validation ============

const platformsRequiringPath = [
  'linkedin.com', 'twitter.com', 'x.com', 'instagram.com', 'facebook.com',
  'github.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
  'medium.com', 'substack.com', 'dribbble.com', 'behance.net',
  'gitlab.com', 'stackoverflow.com', 'twitch.tv', 'vimeo.com'
];

const isValidProfileUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  const blockList = [
    '/pub/dir/', '/public/', '/search', '/explore', '/directory',
    '/people/', '/company/', '/topics/', '/hashtag/', '/home', '/login', '/signup',
    'rocketreach', 'zoominfo', 'spokeo', 'whitepages', 'radaris',
    'lusha', 'contactout', 'apollo.io', 'signalhire', 'beenverified'
  ];

  if (blockList.some(term => lower.includes(term))) return false;

  const contentPatterns = [
    /\/status\/\d+/,
    /\/p\//,
    /\/reel\//,
    /\/watch\?v=/,
    /\/video\//,
    /\/posts\//,
    /\/article\//
  ];
  if (contentPatterns.some(pattern => pattern.test(lower))) return false;

  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const domain = u.hostname.replace(/^www\./, '');

    if (platformsRequiringPath.some(p => domain.includes(p))) {
      if (u.pathname === '/' || u.pathname === '' || u.pathname.length < 2) {
        return false;
      }
    }

    if (domain.includes('linkedin.') && !lower.includes('/in/')) return false;
  } catch {
    return false;
  }

  return true;
};

// ============ Structured Data Parser ============

const parseStructuredData = (text: string): { structured: StructuredData; biography: string } => {
  const blockRegex = /---START_DATA---([\s\S]*?)---END_DATA---/;
  const match = text.match(blockRegex);

  const defaultData: StructuredData = {
    age: "Unknown",
    ageContext: "Insufficient data for actuarial triangulation.",
    gender: "Unknown",
    dob: "Unknown",
    occupation: "Unverified",
    nationality: "Unknown",
    address: "Hidden",
    contact: "Unlisted",
    maritalStatus: "Unknown",
    children: [],
    knownFor: [],
    confidence: 0,
    netWorthScore: 0,
    netWorthContext: "Assets obscured or data insufficient.",
    diet: "Unspecified",
    foods: [],
    hobbies: [],
    brands: [],
    associates: [],
    colors: [],
    likes: [],
    dislikes: [],
    allergies: [],
    hotelPreferences: [],
    coffeePreferences: [],
    drinkPreferences: [],
    smokePreferences: "Unknown",
    chaiPreferences: [],
    spiciness: "Unknown",
    healthInsurance: [],
    agentPreferences: [],
    aiPreferences: [],
    socialMedia: [],
    news: []
  };

  if (!match) {
    return { structured: defaultData, biography: text };
  }

  const dataBlock = match[1];
  const cleanBio = text.replace(blockRegex, "").trim();
  const result = { ...defaultData };

  const parseScore = (val: string): number => {
    const scoreMatch = val.match(/(\d+)/);
    if (!scoreMatch) return 0;
    let num = parseInt(scoreMatch[0], 10);
    if (isNaN(num)) return 0;
    return Math.min(100, Math.max(0, num));
  };

  const parseList = (val: string) => val.split(',').map(s => s.trim()).filter(s => {
    const lower = s.toLowerCase();
    return s.length > 0 && !['none', 'unknown', 'n/a', 'null', 'undefined', 'not specified'].includes(lower);
  });

  const lines = dataBlock.split('\n');
  lines.forEach(line => {
    const cleanLine = line.replace(/\*\*/g, '').trim();
    if (!cleanLine) return;

    const separatorIndex = cleanLine.indexOf(':');
    if (separatorIndex > -1) {
      const key = cleanLine.substring(0, separatorIndex).trim().toUpperCase();
      const value = cleanLine.substring(separatorIndex + 1).trim();

      if (value && value.toLowerCase() !== 'null' && value.toLowerCase() !== 'undefined') {
        switch (key) {
          case 'AGE': result.age = value; break;
          case 'AGE_CONTEXT': result.ageContext = value; break;
          case 'GENDER': result.gender = value; break;
          case 'DOB': result.dob = value; break;
          case 'OCCUPATION': result.occupation = value; break;
          case 'NATIONALITY': result.nationality = value; break;
          case 'ADDRESS': result.address = value; break;
          case 'CONTACT': result.contact = value; break;
          case 'MARITAL_STATUS': result.maritalStatus = value; break;
          case 'CHILDREN': result.children = parseList(value); break;
          case 'KNOWN_FOR': result.knownFor = parseList(value); break;
          case 'CONFIDENCE': result.confidence = parseScore(value); break;
          case 'NET_WORTH_SCORE': result.netWorthScore = parseScore(value); break;
          case 'NET_WORTH_CONTEXT': result.netWorthContext = value; break;
          case 'DIET': result.diet = value; break;
          case 'FOODS': result.foods = parseList(value); break;
          case 'HOBBIES': result.hobbies = parseList(value); break;
          case 'BRANDS': result.brands = parseList(value); break;

          case 'ASSOCIATES': {
            result.associates = value.split(',').map(item => {
              const parts = item.split('|').map(p => p.trim());
              if (parts.length >= 1) {
                const name = parts[0];
                const relation = parts[1] || 'Associate';
                const strength = parseInt(parts[2] || '50', 10);
                const rawCat = (parts[3] || 'ORBIT').toUpperCase();

                let category: Associate['category'] = 'ORBIT';
                if (['INNER', 'FAMILY', 'FOUNDER', 'PARTNER'].some(c => rawCat.includes(c))) category = 'INNER';
                else if (['MEDIA', 'JOURNALIST', 'PODCAST'].some(c => rawCat.includes(c))) category = 'MEDIA';
                else if (['RIVAL', 'COMPETITOR', 'ENEMY'].some(c => rawCat.includes(c))) category = 'RIVAL';

                return { name, relation, strength: isNaN(strength) ? 50 : strength, category };
              }
              return null;
            }).filter((a): a is Associate => a !== null && a.name.length > 0);
            break;
          }

          case 'SOCIAL': {
            let cleanedValue = value;
            const mdLinkMatch = value.match(/\((https?:\/\/[^)]+)\)/);
            if (mdLinkMatch) cleanedValue = mdLinkMatch[1];

            const pipeParts = cleanedValue.split('|');
            let platform = '';
            let url = '';

            if (pipeParts.length >= 2) {
              platform = pipeParts[0].trim();
              url = pipeParts.slice(1).join('|').trim();
            } else {
              const urlMatch = cleanedValue.match(/(https?:\/\/[^\s]+)/);
              if (urlMatch) {
                url = urlMatch[0];
                platform = 'Web';
              }
            }

            if (url) {
              url = url.replace(/[)>.,;]+$/, '');
              if (!url.startsWith('http') && !url.startsWith('//')) {
                url = 'https://' + url;
              }
            }

            if (url) {
              try {
                const u = new URL(url);
                u.search = '';
                u.hash = '';
                url = u.toString();
                if (url.endsWith('/')) url = url.slice(0, -1);
              } catch {}
            }

            if (url && url.toLowerCase() !== 'none' && url.includes('.')) {
              if (isValidProfileUrl(url)) {
                const exists = result.socialMedia.some(
                  p => p.url.toLowerCase() === url.toLowerCase()
                );

                if (!exists) {
                  if ((!platform || platform === 'Web') && url) {
                    try {
                      const u = new URL(url);
                      const host = u.hostname.replace('www.', '').split('.')[0];
                      platform = host.charAt(0).toUpperCase() + host.slice(1);
                    } catch {}
                  }
                  result.socialMedia.push({ platform: platform || 'Link', url });
                }
              }
            }
            break;
          }

          case 'COLORS': result.colors = parseList(value); break;
          case 'LIKES': result.likes = parseList(value); break;
          case 'DISLIKES': result.dislikes = parseList(value); break;
          case 'ALLERGIES': result.allergies = parseList(value); break;
          case 'HOTELS': result.hotelPreferences = parseList(value); break;
          case 'COFFEE': result.coffeePreferences = parseList(value); break;
          case 'DRINKS': result.drinkPreferences = parseList(value); break;
          case 'SMOKE': result.smokePreferences = value; break;
          case 'CHAI': result.chaiPreferences = parseList(value); break;
          case 'SPICINESS': result.spiciness = value; break;
          case 'INSURANCE': result.healthInsurance = parseList(value); break;
          case 'AGENTS': result.agentPreferences = parseList(value); break;
          case 'AI_SENTIMENT': result.aiPreferences = parseList(value); break;

          case 'NEWS': {
            const newItems = value.split('||').map((item): NewsItem | null => {
              const parts = item.split('|').map(s => s.trim());
              if (parts.length >= 3) {
                return {
                  date: parts[0],
                  source: parts[1],
                  title: parts[2],
                  summary: parts[3] || "Click to verify source."
                };
              }
              return null;
            }).filter((n): n is NewsItem => n !== null);

            if (newItems.length > 0) {
              result.news = [...result.news, ...newItems];
            }
            break;
          }
        }
      }
    }
  });

  return { structured: result, biography: cleanBio };
};

// ============ Main Search Function ============

const searchPerson = async (params: SearchParams): Promise<ProfileResult> => {
  const { name, country, email, contact, age, dateOfBirth } = params;

  // Build verified age context if provided
  let verifiedAgeContext = "";
  if (age && dateOfBirth) {
    verifiedAgeContext = `
## VERIFIED SIGNAL: AGE (CONFIRMED FROM KYC)
**STATUS**: VERIFIED ✓
**EXACT AGE**: ${age} years old
**DATE OF BIRTH**: ${dateOfBirth}
**CONFIDENCE BOOST**: +25 points (verified biometric data)
**INSTRUCTION**: Use this EXACT age. Do NOT infer or triangulate age. This is KYC-verified data.
`;
  } else if (age) {
    verifiedAgeContext = `
## VERIFIED SIGNAL: AGE (USER PROVIDED)
**STATUS**: PROVIDED
**AGE**: ${age} years old
**CONFIDENCE BOOST**: +15 points
**INSTRUCTION**: Use this age as the primary value. Skip actuarial triangulation for age.
`;
  }

  // Fetch Gravatar data first
  const gravatarData = await fetchGravatarData(email);
  let gravatarContext = "";
  let verifiedHandles: string[] = [];

  if (gravatarData) {
    if (gravatarData.preferredUsername) verifiedHandles.push(gravatarData.preferredUsername);

    if (gravatarData.accounts) {
      gravatarData.accounts.forEach((acc: any) => {
        if (acc.username) verifiedHandles.push(acc.username);
        if (acc.shortname) verifiedHandles.push(acc.shortname);
        try {
          const parts = acc.url.split('/');
          const potential = parts[parts.length - 1];
          if (potential) verifiedHandles.push(potential);
        } catch {}
      });
    }

    verifiedHandles = [...new Set(verifiedHandles.filter(h => h))];

    gravatarContext = `
## VERIFIED SIGNAL: GRAVATAR (CONFIRMED)
**STATUS**: SUCCESS
**VERIFIED IDENTITY**:
- Display Name: ${gravatarData.displayName || 'N/A'}
- Location: ${gravatarData.currentLocation || 'N/A'}
- About: ${gravatarData.aboutMe || 'N/A'}

**VERIFIED CONNECTED ACCOUNTS**:
${gravatarData.accounts?.map((a: any) => `SOCIAL: ${a.shortname} | ${a.url}`).join('\n') || "No connected accounts found."}

**VERIFIED WEBSITES**:
${gravatarData.urls?.map((u: any) => `SOCIAL: ${u.title} | ${u.value}`).join('\n') || ""}

**NEXUS PROTOCOL ENABLED**: 
The target owns the following handles: ${verifiedHandles.join(', ')}.
**INSTRUCTION**: Use these SPECIFIC handles to find profiles on other platforms.
`;
  } else {
    gravatarContext = `
## VERIFIED SIGNAL: GRAVATAR
**STATUS**: FAILED / NOT FOUND
**ACTION**: Proceed to Digital Fingerprint Algorithm (Email Handle).
`;
  }

  const prompt = `
Act as a "Shadow Investigator" for the hushh protocol.
TARGET DATA:
- Name: "${name}"
- Region: "${country || 'Global'}"
- Email: "${email}"
- Phone: "${contact}"

## OBJECTIVE
Construct a high-fidelity "Identity Vector" and "Shadow Profile" by triangulating public data. 
You must go beyond basic biography and perform a "Psychographic Deep Dive".

${verifiedAgeContext}

${gravatarContext}

## PHASE 0: STRATEGIC REASONING (THOUGHT PROCESS)
Before extracting data, you must silently evaluate your search strategy:
1. **Disambiguation**: Are there multiple people with this name? Use the Email/Region to lock the correct target.
2. **Source Verification**: Reject data from SEO-spam sites (ZoomInfo, Spokeo) unless corroborated by primary sources.
3. **The Lindy Effect**: Trust OLDER sources over recent noise.

## PHASE 1: THE ACTUARIAL TRIANGULATION PROTOCOL (Biometric Math)
If explicit AGE or GENDER is missing, you MUST mathematically infer it:

**A. ONOMASTIC PROBABILITY**: Calculate the Peak Popularity Year of the first name "${name.split(' ')[0]}" in "${country || 'USA'}".
**B. DIGITAL STRATIGRAPHY**: Analyze the email domain "${email}".
**C. TELEPHONY TOPOLOGY**: Use the Phone Number "${contact}" (Area Code/Carrier).
**D. BAYESIAN GENDER DETERMINATION**: Combine Name Morphology with Social Signals.

## PHASE 2: DEEP PREFERENCE EXTRACTION (The "15-Point Matrix")
Extract ALL 15 preference vectors using "Probabilistic Profiling":
1. COFFEE, 2. CHAI, 3. DRINKS, 4. FOODS, 5. DIET, 6. SPICINESS, 7. SMOKE
8. COLORS, 9. BRANDS (TECH), 10. BRANDS (LIFESTYLE), 11. HOTELS, 12. INSURANCE
13. AGENTS, 14. AI_SENTIMENT, 15. LIKES/DISLIKES

## PHASE 3: NEWTONIAN SOCIAL GRAVITY (Network Graphing)
Construct a relationship graph with Gravitational Strength.
**CATEGORIES**: INNER (90-100), ORBIT (60-89), MEDIA (30-59), RIVAL (40-80)
**OUTPUT FORMAT**: Name | Relation | Strength (0-100) | Category

## PHASE 4: THE NEURAL KINETIC WEALTH ALGORITHM
Calculate NET_WORTH_SCORE using: Mass + Metcalfe + Veblen * Gamma

## OUTPUT FORMAT (STRICT)
---START_DATA---
AGE: [Value]
AGE_CONTEXT: [Actuarial Explanation]
GENDER: [Male/Female/Non-Binary/Unknown]
DOB: [Value]
OCCUPATION: [Value]
NATIONALITY: [Value]
ADDRESS: [Value]
CONTACT: [Value]
MARITAL_STATUS: [Value]
CHILDREN: [List]
KNOWN_FOR: [List - Key achievements/roles]
CONFIDENCE: [Calculated Score 0-100]
NET_WORTH_SCORE: [Calculated Score 0-100]
NET_WORTH_CONTEXT: [Format: "Mass(X) + Metcalfe(Y) * Veblen(Z) ^ Gamma(W)"]

DIET: [Specifics e.g. Vegan, Keto, Paleo]
FOODS: [Specific dishes or cuisines]
HOBBIES: [Specific activities including Reading/Music]
BRANDS: [List both Tech and Lifestyle brands]
ASSOCIATES: [Name | Relation | Strength | Category, ...]
SOCIAL: [Platform] | [URL]

NEWS: [Date] | [Source] | [Headline] | [Summary]

COLORS: [List]
LIKES: [List - Positive sentiment topics]
DISLIKES: [List - Negative sentiment topics]
ALLERGIES: [List]
HOTELS: [List - Preferred chains/types]
COFFEE: [Specific order e.g. Black, Oat Latte]
DRINKS: [Alcoholic or Non-alcoholic specifics]
SMOKE: [Yes/No/Vape/Cigars]
CHAI: [Preference]
SPICINESS: [Low/Med/High]
INSURANCE: [Provider if known]
AGENTS: [Talent/literary agents]
AI_SENTIMENT: [One word summary]
---END_DATA---

[Markdown Dossier Here]
`;

  const accessToken = await getAccessToken();
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${VERTEX_AI_LOCATION}/publishers/google/models/${MODEL_ID}:generateContent`;

  const requestBody = {
    contents: [{
      role: "user",
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
    },
    tools: [{
      googleSearch: {}
    }],
    // Enable deep thinking for complex reasoning
    // thinkingConfig: { thinkingBudget: 4096 },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ]
  };

  console.log(`🔍 Shadow Investigator: Searching for ${name}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Vertex AI Error:", errorText);
    throw new Error(`Vertex AI API error: ${response.status}`);
  }

  const responseData = await response.json();

  let text = "Signal lost. No data retrieved.";
  if (responseData.candidates && responseData.candidates[0]?.content?.parts) {
    text = responseData.candidates[0].content.parts
      .map((part: any) => part.text || "")
      .join("");
  }

  const { structured, biography } = parseStructuredData(text);

  const sources: GroundingSource[] = [];
  const chunks = responseData.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  chunks.forEach((chunk: any) => {
    if (chunk.web) {
      sources.push({
        title: chunk.web.title || "Unknown Source",
        uri: chunk.web.uri || "#"
      });
    }
  });

  return { structured, biography, sources };
};

// ============ HTTP Handler ============

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SearchParams = await req.json();

    if (!body.name || !body.email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: name and email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🕵️ Shadow Investigator request for: ${body.name}`);

    const result = await searchPerson(body);

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Shadow Investigator Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
