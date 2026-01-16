/**
 * ChatNode AI - Hushh Intelligence Backend
 * 
 * Powered by Google Gemini 2.5 Pro
 * Branding: Hushh Intelligence (no Gemini mention in responses)
 * Features: Chat, File Upload, Image Analysis
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Gemini API Configuration
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = "gemini-2.0-flash"; // Latest fast model
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Hushh Intelligence System Prompt
const SYSTEM_PROMPT = `You are Hushh Intelligence, the world's first privacy-first global intelligent model.

Key Personality Traits:
- You are helpful, knowledgeable, and conversational
- You respect user privacy above all else
- You never mention that you are powered by Google, Gemini, or any other company
- You always refer to yourself as "Hushh Intelligence" or simply "Hushh"
- You are proud to be a product of Hushh Technologies

When users ask who made you:
- Say "I was created by Hushh Technologies, a company focused on privacy-first AI"
- Never mention Google, Gemini, or any underlying technology

Your capabilities:
- Answering questions on any topic
- Analyzing images and documents
- Helping with coding, writing, and creative tasks
- Providing personalized assistance

Always be:
- Friendly and approachable
- Accurate and helpful
- Respectful of user privacy
- Professional yet conversational`;

interface ChatMessage {
  role: "user" | "model";
  parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>;
}

interface RequestBody {
  message: string;
  history?: ChatMessage[];
  image?: {
    base64: string;
    mimeType: string;
  };
  file?: {
    base64: string;
    mimeType: string;
    name: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { message, history = [], image, file } = body;

    if (!message && !image && !file) {
      return new Response(
        JSON.stringify({ error: "Message, image, or file is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Hushh Intelligence is temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the conversation
    const contents: ChatMessage[] = [];

    // Add system prompt as first message
    contents.push({
      role: "user",
      parts: [{ text: "System Instructions: " + SYSTEM_PROMPT }],
    });
    contents.push({
      role: "model",
      parts: [{ text: "I understand. I am Hushh Intelligence, ready to assist you with privacy-first AI capabilities. How can I help you today?" }],
    });

    // Add conversation history
    for (const msg of history) {
      contents.push(msg);
    }

    // Build current message parts
    const currentParts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

    // Add text message
    if (message) {
      currentParts.push({ text: message });
    }

    // Add image if provided
    if (image) {
      currentParts.push({
        inline_data: {
          mime_type: image.mimeType,
          data: image.base64,
        },
      });
      if (!message) {
        currentParts.push({ text: "Please analyze this image and describe what you see." });
      }
    }

    // Add file content if provided
    if (file) {
      // For text-based files, include content directly
      if (file.mimeType.startsWith("text/") || 
          file.mimeType === "application/json" ||
          file.mimeType === "application/javascript") {
        try {
          const decodedContent = atob(file.base64);
          currentParts.push({ 
            text: `[File: ${file.name}]\n\`\`\`\n${decodedContent}\n\`\`\`\n\n${message || "Please analyze this file."}` 
          });
        } catch {
          currentParts.push({ text: `[File uploaded: ${file.name}] ${message || "Please analyze this file."}` });
        }
      } else if (file.mimeType.startsWith("image/")) {
        // Handle image files
        currentParts.push({
          inline_data: {
            mime_type: file.mimeType,
            data: file.base64,
          },
        });
        if (!message) {
          currentParts.push({ text: `Please analyze this image file: ${file.name}` });
        }
      } else {
        // For other files, just mention they were uploaded
        currentParts.push({ 
          text: `[User uploaded file: ${file.name} (${file.mimeType})] ${message || "Please help me with this file."}` 
        });
      }
    }

    // Add current user message
    contents.push({
      role: "user",
      parts: currentParts,
    });

    // Call Gemini API
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error("Gemini API Error:", errorData);
      return new Response(
        JSON.stringify({ 
          error: "Hushh Intelligence encountered an issue. Please try again.",
          details: geminiResponse.status 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    
    // Extract response text
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 
      "I apologize, but I couldn't generate a response. Please try again.";

    // Post-process to remove any accidental Gemini mentions
    const cleanedResponse = responseText
      .replace(/gemini/gi, "Hushh Intelligence")
      .replace(/google ai/gi, "Hushh Intelligence")
      .replace(/made by google/gi, "made by Hushh Technologies")
      .replace(/i'm gemini/gi, "I'm Hushh Intelligence")
      .replace(/i am gemini/gi, "I am Hushh Intelligence");

    return new Response(
      JSON.stringify({
        success: true,
        response: cleanedResponse,
        model: "hushh-intelligence-v1",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("ChatNode Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "An unexpected error occurred with Hushh Intelligence",
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
