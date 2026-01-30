/**
 * NDA Service
 * Handles all NDA-related API calls for the global NDA gate feature
 */

import config from '../../resources/config/config';

export interface NDAStatus {
  hasSignedNda: boolean;
  signedAt: string | null;
  ndaVersion: string | null;
  signerName: string | null;
}

export interface SignNDAResult {
  success: boolean;
  signedAt?: string;
  signerName?: string;
  ndaVersion?: string;
  error?: string;
}

/**
 * Check if the current user has signed the NDA
 */
export const checkNDAStatus = async (userId: string): Promise<NDAStatus> => {
  try {
    if (!config.supabaseClient) {
      console.error('Supabase client not initialized');
      return {
        hasSignedNda: false,
        signedAt: null,
        ndaVersion: null,
        signerName: null,
      };
    }
    
    const { data, error } = await config.supabaseClient
      .rpc('check_user_nda_status', { p_user_id: userId });
    
    if (error) {
      console.error('Error checking NDA status:', error);
      return {
        hasSignedNda: false,
        signedAt: null,
        ndaVersion: null,
        signerName: null,
      };
    }
    
    return data as NDAStatus;
  } catch (err) {
    console.error('Error in checkNDAStatus:', err);
    return {
      hasSignedNda: false,
      signedAt: null,
      ndaVersion: null,
      signerName: null,
    };
  }
};

/**
 * Sign the global NDA
 */
export const signNDA = async (
  signerName: string,
  ndaVersion: string = 'v1.0',
  pdfUrl?: string
): Promise<SignNDAResult> => {
  try {
    if (!config.supabaseClient) {
      console.error('Supabase client not initialized');
      return {
        success: false,
        error: 'Supabase client not initialized',
      };
    }
    
    // Get client IP for audit trail (best effort)
    let signerIp = 'unknown';
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      signerIp = ipData.ip;
    } catch (ipErr) {
      console.warn('Could not fetch client IP:', ipErr);
    }
    
    const { data, error } = await config.supabaseClient
      .rpc('sign_global_nda', {
        p_signer_name: signerName,
        p_nda_version: ndaVersion,
        p_pdf_url: pdfUrl || null,
        p_signer_ip: signerIp,
      });
    
    if (error) {
      console.error('Error signing NDA:', error);
      return {
        success: false,
        error: error.message,
      };
    }
    
    return data as SignNDAResult;
  } catch (err) {
    console.error('Error in signNDA:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

/**
 * Generate personalized NDA PDF using Cloud Run service
 */
export const generateNDAPdf = async (
  metadata: Record<string, unknown>,
  accessToken: string
): Promise<{ success: boolean; pdfUrl?: string; blob?: Blob; error?: string }> => {
  try {
    const response = await fetch(
      'https://hushhtech-nda-generation-53407187172.us-central1.run.app/generate-nda',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'jwt-token': accessToken,
        },
        body: JSON.stringify({ metadata }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to generate PDF: ${errorText}`,
      };
    }
    
    const blob = await response.blob();
    const pdfUrl = URL.createObjectURL(blob);
    
    return {
      success: true,
      pdfUrl,
      blob,
    };
  } catch (err) {
    console.error('Error generating NDA PDF:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

/**
 * Upload signed NDA PDF to Supabase Storage
 */
export const uploadSignedNDA = async (
  userId: string,
  pdfBlob: Blob
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    if (!config.supabaseClient) {
      console.error('Supabase client not initialized');
      return {
        success: false,
        error: 'Supabase client not initialized',
      };
    }
    
    const fileName = `nda_${userId}_${Date.now()}.pdf`;
    const filePath = `signed-ndas/${fileName}`;
    
    const { data, error } = await config.supabaseClient.storage
      .from('assets')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false,
      });
    
    if (error) {
      console.error('Error uploading NDA PDF:', error);
      return {
        success: false,
        error: error.message,
      };
    }
    
    // Get public URL
    const { data: urlData } = config.supabaseClient.storage
      .from('assets')
      .getPublicUrl(filePath);
    
    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (err) {
    console.error('Error in uploadSignedNDA:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};

export default {
  checkNDAStatus,
  signNDA,
  generateNDAPdf,
  uploadSignedNDA,
};
