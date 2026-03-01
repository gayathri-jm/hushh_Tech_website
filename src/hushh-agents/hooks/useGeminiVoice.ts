/**
 * Gemini Live API Voice Hook
 * Real-time voice conversations with Tamil support
 * Uses WebSocket for low-latency bidirectional audio streaming
 */
import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  transcript: string;
  response: string;
}

export interface UseGeminiVoiceOptions {
  language: 'en-US' | 'hi-IN' | 'ta-IN';
  onTranscript?: (text: string) => void;
  onResponse?: (text: string) => void;
  onError?: (error: string) => void;
}

// Tamil system instructions for voice
const TAMIL_SYSTEM_PROMPT = `நீங்கள் ஹஷ் (Hushh) AI உதவியாளர். தமிழில் பதிலளிக்கவும்.
You are Hushh AI assistant. Always respond in Tamil language.
Be helpful, friendly, and conversational.
Keep responses concise for voice conversations.`;

const ENGLISH_SYSTEM_PROMPT = `You are Hushh AI assistant. Be helpful, friendly, and conversational.
Keep responses concise for voice conversations.`;

const HINDI_SYSTEM_PROMPT = `आप हुश AI सहायक हैं। हिंदी में जवाब दें।
Be helpful, friendly, and conversational.
Keep responses concise for voice conversations.`;

export function useGeminiVoice(options: UseGeminiVoiceOptions) {
  const { language, onTranscript, onResponse, onError } = options;
  
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isSpeaking: false,
    isConnected: false,
    isConnecting: false,
    error: null,
    transcript: '',
    response: '',
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // Get system prompt based on language
  const getSystemPrompt = useCallback(() => {
    switch (language) {
      case 'ta-IN': return TAMIL_SYSTEM_PROMPT;
      case 'hi-IN': return HINDI_SYSTEM_PROMPT;
      default: return ENGLISH_SYSTEM_PROMPT;
    }
  }, [language]);

  // Play audio from queue
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    
    isPlayingRef.current = true;
    setState(prev => ({ ...prev, isSpeaking: true }));

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }

      while (audioQueueRef.current.length > 0) {
        const audioData = audioQueueRef.current.shift();
        if (!audioData) continue;

        // Convert PCM to AudioBuffer (24kHz, mono, 16-bit)
        const int16Array = new Int16Array(audioData);
        const float32Array = new Float32Array(int16Array.length);
        
        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768;
        }

        const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
      }
    } catch (err) {
      console.error('Audio playback error:', err);
    } finally {
      isPlayingRef.current = false;
      setState(prev => ({ ...prev, isSpeaking: false }));
    }
  }, []);

  // Connect to Gemini Live API
  const connect = useCallback(async () => {
    if (state.isConnected || state.isConnecting) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Get ephemeral token from our API
      const tokenRes = await fetch('/api/gemini-ephemeral-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });

      if (!tokenRes.ok) {
        throw new Error('Failed to get ephemeral token');
      }

      const { token, wsUrl } = await tokenRes.json();

      // Connect to Gemini Live API via WebSocket
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to Gemini Live API');
        
        // Send setup message
        ws.send(JSON.stringify({
          setup: {
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
              response_modalities: ['AUDIO', 'TEXT'],
              system_instruction: getSystemPrompt(),
              speech_config: {
                language_code: language,
              },
            },
          },
        }));

        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false 
        }));
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle transcription
          if (data.serverContent?.inputTranscript) {
            const transcript = data.serverContent.inputTranscript;
            setState(prev => ({ ...prev, transcript }));
            onTranscript?.(transcript);
          }

          // Handle text response
          if (data.serverContent?.modelTurn?.parts) {
            for (const part of data.serverContent.modelTurn.parts) {
              if (part.text) {
                setState(prev => ({ ...prev, response: part.text }));
                onResponse?.(part.text);
              }
              
              // Handle audio response
              if (part.inlineData?.data) {
                const audioData = Uint8Array.from(atob(part.inlineData.data), c => c.charCodeAt(0));
                audioQueueRef.current.push(audioData.buffer);
                playNextAudio();
              }
            }
          }

          // Handle interruption
          if (data.serverContent?.interrupted) {
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            setState(prev => ({ ...prev, isSpeaking: false }));
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        const errorMsg = 'Connection error. Please try again.';
        setState(prev => ({ ...prev, error: errorMsg }));
        onError?.(errorMsg);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          isListening: false,
        }));
        wsRef.current = null;
      };

    } catch (err) {
      console.error('Connection error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
      setState(prev => ({ 
        ...prev, 
        error: errorMsg, 
        isConnecting: false 
      }));
      onError?.(errorMsg);
    }
  }, [state.isConnected, state.isConnecting, language, getSystemPrompt, onTranscript, onResponse, onError, playNextAudio]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!state.isConnected || state.isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      // Create MediaRecorder for PCM audio
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      // Create audio worklet for PCM conversion
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(1024, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!state.isListening || !wsRef.current) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }

        // Send to Gemini
        wsRef.current.send(JSON.stringify({
          realtimeInput: {
            audio: {
              data: btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer))),
              mimeType: 'audio/pcm;rate=16000',
            },
          },
        }));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setState(prev => ({ ...prev, isListening: true }));

    } catch (err) {
      console.error('Microphone error:', err);
      const errorMsg = 'Microphone access denied. Please allow microphone access.';
      setState(prev => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
    }
  }, [state.isConnected, state.isListening, onError]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    stopListening();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    audioQueueRef.current = [];
    setState({
      isListening: false,
      isSpeaking: false,
      isConnected: false,
      isConnecting: false,
      error: null,
      transcript: '',
      response: '',
    });
  }, [stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    startListening,
    stopListening,
  };
}

export default useGeminiVoice;
