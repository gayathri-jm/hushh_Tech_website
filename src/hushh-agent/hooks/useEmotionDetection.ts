/**
 * useEmotionDetection Hook
 * Real-time facial emotion detection using MediaPipe
 * Updates state at ~30fps for smooth UI updates
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { mediapipeService, FaceAnalysis } from '../services/mediapipeService';

interface UseEmotionDetectionOptions {
  /** Target FPS for analysis (default: 30) */
  targetFps?: number;
  /** Callback when emotions change significantly */
  onEmotionChange?: (analysis: FaceAnalysis, previousAnalysis: FaceAnalysis | null) => void;
  /** Callback with emotion context formatted for Gemini */
  onGeminiContext?: (context: string) => void;
  /** How often to send context to Gemini in ms (default: 3000) */
  geminiContextInterval?: number;
}

interface UseEmotionDetectionReturn {
  /** Current face analysis data */
  analysis: FaceAnalysis | null;
  /** Whether MediaPipe is ready */
  isReady: boolean;
  /** Whether actively analyzing */
  isAnalyzing: boolean;
  /** Any error during initialization or analysis */
  error: string | null;
  /** Start analyzing from a video element */
  startAnalysis: (videoElement: HTMLVideoElement) => void;
  /** Stop analysis */
  stopAnalysis: () => void;
  /** Get dominant emotion name */
  dominantEmotion: string | null;
  /** Get emotion context string for Gemini */
  getGeminiContext: () => string;
}

const EMOTION_CHANGE_THRESHOLD = 15; // Minimum change to trigger callback

export const useEmotionDetection = (
  options: UseEmotionDetectionOptions = {}
): UseEmotionDetectionReturn => {
  const {
    targetFps = 30,
    onEmotionChange,
    onGeminiContext,
    geminiContextInterval = 3000,
  } = options;

  const [analysis, setAnalysis] = useState<FaceAnalysis | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const previousAnalysisRef = useRef<FaceAnalysis | null>(null);
  const geminiIntervalRef = useRef<number | null>(null);

  const frameInterval = 1000 / targetFps;

  // Initialize MediaPipe on mount
  useEffect(() => {
    const init = async () => {
      try {
        await mediapipeService.initialize();
        setIsReady(true);
        console.log('[useEmotionDetection] MediaPipe ready');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize MediaPipe';
        setError(message);
        console.error('[useEmotionDetection]', message);
      }
    };

    init();

    return () => {
      mediapipeService.destroy();
    };
  }, []);

  // Check for significant emotion changes
  const hasSignificantChange = useCallback((current: FaceAnalysis, previous: FaceAnalysis | null): boolean => {
    if (!previous) return true;

    const emotions = Object.keys(current.emotions) as (keyof typeof current.emotions)[];
    
    for (const emotion of emotions) {
      const diff = Math.abs(current.emotions[emotion] - previous.emotions[emotion]);
      if (diff > EMOTION_CHANGE_THRESHOLD) return true;
    }

    // Eye contact change
    if (current.eyeContact !== previous.eyeContact) return true;

    // Face detection change
    if (current.faceDetected !== previous.faceDetected) return true;

    return false;
  }, []);

  // Analysis loop
  const analyze = useCallback(() => {
    if (!videoRef.current || !isReady) return;

    const now = performance.now();
    const elapsed = now - lastFrameTimeRef.current;

    if (elapsed >= frameInterval) {
      lastFrameTimeRef.current = now;

      const currentAnalysis = mediapipeService.analyzeFrame(videoRef.current, now);
      setAnalysis(currentAnalysis);

      // Check for significant changes
      if (onEmotionChange && hasSignificantChange(currentAnalysis, previousAnalysisRef.current)) {
        onEmotionChange(currentAnalysis, previousAnalysisRef.current);
      }

      previousAnalysisRef.current = currentAnalysis;
    }

    animationFrameRef.current = requestAnimationFrame(analyze);
  }, [isReady, frameInterval, onEmotionChange, hasSignificantChange]);

  // Start analysis
  const startAnalysis = useCallback((videoElement: HTMLVideoElement) => {
    if (!isReady) {
      setError('MediaPipe not ready yet');
      return;
    }

    videoRef.current = videoElement;
    setIsAnalyzing(true);
    lastFrameTimeRef.current = performance.now();

    // Start analysis loop
    animationFrameRef.current = requestAnimationFrame(analyze);

    // Start Gemini context interval
    if (onGeminiContext) {
      geminiIntervalRef.current = window.setInterval(() => {
        const currentAnalysis = mediapipeService.getLastAnalysis();
        if (currentAnalysis) {
          const context = mediapipeService.formatForGemini(currentAnalysis);
          onGeminiContext(context);
        }
      }, geminiContextInterval);
    }

    console.log('[useEmotionDetection] Analysis started');
  }, [isReady, analyze, onGeminiContext, geminiContextInterval]);

  // Stop analysis
  const stopAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (geminiIntervalRef.current) {
      clearInterval(geminiIntervalRef.current);
      geminiIntervalRef.current = null;
    }

    videoRef.current = null;
    setIsAnalyzing(false);
    console.log('[useEmotionDetection] Analysis stopped');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, [stopAnalysis]);

  // Get dominant emotion
  const dominantEmotion = analysis
    ? Object.entries(analysis.emotions)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || null
    : null;

  // Get Gemini context
  const getGeminiContext = useCallback((): string => {
    if (!analysis) return '[NEURAL VISION] Awaiting face detection...';
    return mediapipeService.formatForGemini(analysis);
  }, [analysis]);

  return {
    analysis,
    isReady,
    isAnalyzing,
    error,
    startAnalysis,
    stopAnalysis,
    dominantEmotion,
    getGeminiContext,
  };
};

export default useEmotionDetection;
