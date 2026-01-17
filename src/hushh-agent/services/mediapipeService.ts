/**
 * MediaPipe Face Detection Service
 * Uses Google's MediaPipe for real-time facial expression analysis
 * Works alongside Gemini Live for intelligent conversation
 */

import { FilesetResolver, FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';

export interface EmotionScores {
  happy: number;
  sad: number;
  angry: number;
  surprised: number;
  neutral: number;
  confused: number;
  confident: number;
}

export interface FaceAnalysis {
  emotions: EmotionScores;
  eyeContact: boolean;
  headPose: {
    yaw: number;   // left/right
    pitch: number; // up/down
    roll: number;  // tilt
  };
  mouthOpen: boolean;
  eyesOpen: boolean;
  blinking: boolean;
  faceDetected: boolean;
  readinessScore: number;
}

// Landmark indices for expression analysis
const LANDMARK_INDICES = {
  // Eyes
  leftEyeUpper: 159,
  leftEyeLower: 145,
  rightEyeUpper: 386,
  rightEyeLower: 374,
  leftEyeInner: 133,
  leftEyeOuter: 33,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  
  // Mouth
  mouthUpper: 13,
  mouthLower: 14,
  mouthLeft: 61,
  mouthRight: 291,
  
  // Eyebrows
  leftEyebrowInner: 107,
  leftEyebrowOuter: 70,
  rightEyebrowInner: 336,
  rightEyebrowOuter: 300,
  
  // Nose
  noseTip: 4,
  noseBase: 168,
  
  // Face contour
  chin: 152,
  foreheadCenter: 10,
  leftCheek: 234,
  rightCheek: 454,
};

class MediaPipeService {
  private faceLandmarker: FaceLandmarker | null = null;
  private isInitialized = false;
  private lastAnalysis: FaceAnalysis | null = null;
  private blinkHistory: boolean[] = [];

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });

      this.isInitialized = true;
      console.log('[MediaPipe] Face Landmarker initialized successfully');
    } catch (error) {
      console.error('[MediaPipe] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Analyze a video frame for facial expressions
   */
  analyzeFrame(videoElement: HTMLVideoElement, timestamp: number): FaceAnalysis {
    if (!this.faceLandmarker || !this.isInitialized) {
      return this.getDefaultAnalysis();
    }

    try {
      const results = this.faceLandmarker.detectForVideo(videoElement, timestamp);
      return this.processResults(results);
    } catch (error) {
      console.error('[MediaPipe] Analysis error:', error);
      return this.getDefaultAnalysis();
    }
  }

  private processResults(results: FaceLandmarkerResult): FaceAnalysis {
    if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
      return { ...this.getDefaultAnalysis(), faceDetected: false };
    }

    const landmarks = results.faceLandmarks[0];
    const blendshapes = results.faceBlendshapes?.[0]?.categories || [];
    const matrix = results.facialTransformationMatrixes?.[0];

    // Extract blendshape values
    const getBlendshape = (name: string): number => {
      const shape = blendshapes.find((b: { categoryName: string; score: number }) => b.categoryName === name);
      return shape?.score || 0;
    };

    // Emotion analysis from blendshapes
    const jawOpen = getBlendshape('jawOpen');
    const mouthSmileLeft = getBlendshape('mouthSmileLeft');
    const mouthSmileRight = getBlendshape('mouthSmileRight');
    const mouthFrownLeft = getBlendshape('mouthFrownLeft');
    const mouthFrownRight = getBlendshape('mouthFrownRight');
    const browDownLeft = getBlendshape('browDownLeft');
    const browDownRight = getBlendshape('browDownRight');
    const browInnerUp = getBlendshape('browInnerUp');
    const browOuterUpLeft = getBlendshape('browOuterUpLeft');
    const browOuterUpRight = getBlendshape('browOuterUpRight');
    const eyeWideLeft = getBlendshape('eyeWideLeft');
    const eyeWideRight = getBlendshape('eyeWideRight');
    const eyeSquintLeft = getBlendshape('eyeSquintLeft');
    const eyeSquintRight = getBlendshape('eyeSquintRight');
    const eyeBlinkLeft = getBlendshape('eyeBlinkLeft');
    const eyeBlinkRight = getBlendshape('eyeBlinkRight');

    // Calculate emotions
    const smileScore = (mouthSmileLeft + mouthSmileRight) / 2;
    const frownScore = (mouthFrownLeft + mouthFrownRight) / 2;
    const browDownScore = (browDownLeft + browDownRight) / 2;
    const browUpScore = (browInnerUp + browOuterUpLeft + browOuterUpRight) / 3;
    const eyeWideScore = (eyeWideLeft + eyeWideRight) / 2;
    const eyeSquintScore = (eyeSquintLeft + eyeSquintRight) / 2;

    // Emotion calculations
    const happy = Math.min(100, Math.round(smileScore * 150 + eyeSquintScore * 50));
    const sad = Math.min(100, Math.round(frownScore * 100 + browDownScore * 50));
    const angry = Math.min(100, Math.round(browDownScore * 100 + eyeSquintScore * 80));
    const surprised = Math.min(100, Math.round(eyeWideScore * 100 + browUpScore * 80 + jawOpen * 50));
    const confused = Math.min(100, Math.round(browInnerUp * 80 + (browOuterUpLeft - browOuterUpRight) * 100));
    
    // Neutral is inverse of other emotions
    const emotionSum = happy + sad + angry + surprised + confused;
    const neutral = Math.max(0, 100 - Math.min(100, emotionSum / 3));
    
    // Confidence based on posture and expression stability
    const confident = Math.min(100, Math.round(
      (100 - Math.abs(this.calculateYaw(landmarks)) * 2) * 0.4 +
      smileScore * 30 +
      (1 - browDownScore) * 30
    ));

    // Eye contact detection (centered gaze)
    const eyeContact = this.calculateEyeContact(landmarks);

    // Head pose from transformation matrix or landmarks
    const headPose = this.calculateHeadPose(landmarks, matrix);

    // Mouth and eye state
    const mouthOpen = jawOpen > 0.1;
    const blinking = (eyeBlinkLeft > 0.3 || eyeBlinkRight > 0.3);
    
    // Track blink history
    this.blinkHistory.push(blinking);
    if (this.blinkHistory.length > 30) this.blinkHistory.shift();
    
    const eyesOpen = !blinking;

    // Readiness score
    const readinessScore = Math.min(100, Math.round(
      eyeContact ? 30 : 0 +
      (Math.abs(headPose.yaw) < 15 ? 25 : 10) +
      (Math.abs(headPose.pitch) < 10 ? 25 : 10) +
      confident * 0.2
    ));

    this.lastAnalysis = {
      emotions: { happy, sad, angry, surprised, neutral, confused, confident },
      eyeContact,
      headPose,
      mouthOpen,
      eyesOpen,
      blinking,
      faceDetected: true,
      readinessScore,
    };

    return this.lastAnalysis;
  }

  private calculateEyeContact(landmarks: any[]): boolean {
    // Check if eyes are roughly centered in frame
    const leftEye = landmarks[LANDMARK_INDICES.leftEyeInner];
    const rightEye = landmarks[LANDMARK_INDICES.rightEyeInner];
    
    const avgX = (leftEye.x + rightEye.x) / 2;
    const avgY = (leftEye.y + rightEye.y) / 2;
    
    // Check if roughly centered (0.3-0.7 range)
    const centeredX = avgX > 0.3 && avgX < 0.7;
    const centeredY = avgY > 0.2 && avgY < 0.6;
    
    return centeredX && centeredY;
  }

  private calculateHeadPose(landmarks: any[], matrix?: any): { yaw: number; pitch: number; roll: number } {
    // Use facial transformation matrix if available
    if (matrix) {
      // Extract Euler angles from matrix
      // Simplified extraction
      return {
        yaw: Math.round(Math.atan2(matrix[8], matrix[0]) * (180 / Math.PI)),
        pitch: Math.round(Math.asin(-matrix[4]) * (180 / Math.PI)),
        roll: Math.round(Math.atan2(matrix[1], matrix[5]) * (180 / Math.PI)),
      };
    }

    // Fallback to landmark-based calculation
    const nose = landmarks[LANDMARK_INDICES.noseTip];
    const leftCheek = landmarks[LANDMARK_INDICES.leftCheek];
    const rightCheek = landmarks[LANDMARK_INDICES.rightCheek];
    const forehead = landmarks[LANDMARK_INDICES.foreheadCenter];
    const chin = landmarks[LANDMARK_INDICES.chin];

    // Yaw (left/right) based on nose position relative to cheeks
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
    const noseOffset = nose.x - (leftCheek.x + faceWidth / 2);
    const yaw = Math.round((noseOffset / faceWidth) * 90);

    // Pitch (up/down) based on nose-forehead-chin alignment
    const faceHeight = Math.abs(chin.y - forehead.y);
    const noseVerticalOffset = nose.y - forehead.y - faceHeight * 0.4;
    const pitch = Math.round((noseVerticalOffset / faceHeight) * 45);

    // Roll (tilt) based on eye alignment
    const leftEye = landmarks[LANDMARK_INDICES.leftEyeInner];
    const rightEye = landmarks[LANDMARK_INDICES.rightEyeInner];
    const eyeDeltaY = rightEye.y - leftEye.y;
    const eyeDeltaX = rightEye.x - leftEye.x;
    const roll = Math.round(Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI));

    return { yaw, pitch, roll };
  }

  private calculateYaw(landmarks: any[]): number {
    const nose = landmarks[LANDMARK_INDICES.noseTip];
    const leftCheek = landmarks[LANDMARK_INDICES.leftCheek];
    const rightCheek = landmarks[LANDMARK_INDICES.rightCheek];
    
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
    const noseOffset = nose.x - (leftCheek.x + faceWidth / 2);
    
    return (noseOffset / faceWidth) * 90;
  }

  private getDefaultAnalysis(): FaceAnalysis {
    return {
      emotions: {
        happy: 0,
        sad: 0,
        angry: 0,
        surprised: 0,
        neutral: 100,
        confused: 0,
        confident: 50,
      },
      eyeContact: false,
      headPose: { yaw: 0, pitch: 0, roll: 0 },
      mouthOpen: false,
      eyesOpen: true,
      blinking: false,
      faceDetected: false,
      readinessScore: 0,
    };
  }

  /**
   * Get last analysis result
   */
  getLastAnalysis(): FaceAnalysis | null {
    return this.lastAnalysis;
  }

  /**
   * Format analysis as context string for Gemini
   */
  formatForGemini(analysis: FaceAnalysis): string {
    if (!analysis.faceDetected) {
      return '[NEURAL VISION] No face detected. Cannot read emotional state.';
    }

    const dominantEmotion = Object.entries(analysis.emotions)
      .sort(([, a], [, b]) => b - a)[0];

    const lines = [
      '[NEURAL VISION CONTEXT]',
      `Primary emotion: ${dominantEmotion[0].toUpperCase()} (${dominantEmotion[1]}%)`,
      `Eye contact: ${analysis.eyeContact ? 'Direct - engaged' : 'Averted - distracted'}`,
      `Head position: ${this.describeHeadPose(analysis.headPose)}`,
      `Readiness score: ${analysis.readinessScore}/100`,
      '',
      'Detailed emotions:',
      `  Happy: ${analysis.emotions.happy}%`,
      `  Confident: ${analysis.emotions.confident}%`,
      `  Neutral: ${analysis.emotions.neutral}%`,
      `  Confused: ${analysis.emotions.confused}%`,
      `  Surprised: ${analysis.emotions.surprised}%`,
    ];

    return lines.join('\n');
  }

  private describeHeadPose(pose: { yaw: number; pitch: number; roll: number }): string {
    const parts: string[] = [];
    
    if (Math.abs(pose.yaw) < 10 && Math.abs(pose.pitch) < 10) {
      return 'Facing camera directly - attentive';
    }
    
    if (pose.yaw > 10) parts.push('turned right');
    else if (pose.yaw < -10) parts.push('turned left');
    
    if (pose.pitch > 10) parts.push('looking down');
    else if (pose.pitch < -10) parts.push('looking up');
    
    if (pose.roll > 10) parts.push('tilted right');
    else if (pose.roll < -10) parts.push('tilted left');
    
    return parts.length > 0 ? parts.join(', ') : 'centered';
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    this.isInitialized = false;
    this.lastAnalysis = null;
    console.log('[MediaPipe] Service destroyed');
  }
}

// Singleton instance
export const mediapipeService = new MediaPipeService();
export default mediapipeService;
