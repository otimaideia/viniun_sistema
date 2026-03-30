import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  waveformData: number[];
}

export interface UseAudioRecorderReturn extends AudioRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  clearRecording: () => void;
}

const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
];

function getSupportedMimeType(): string {
  for (const mimeType of MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return "audio/webm"; // Fallback
}

// Max waveform bars to keep
const MAX_WAVEFORM_BARS = 50;

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    error: null,
    waveformData: [],
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveformRef = useRef<number[]>([]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore errors when stopping
        }
      }
      mediaRecorderRef.current = null;
    }

    chunksRef.current = [];
    startTimeRef.current = 0;
    pausedDurationRef.current = 0;
    waveformRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
    };
  }, [cleanup, state.audioUrl]);

  // Waveform analyzer - reads real audio data
  const startWaveformAnalysis = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let lastUpdate = 0;

      const updateWaveform = () => {
        if (!analyserRef.current) return;

        const now = Date.now();
        // Update waveform every 80ms for smooth animation
        if (now - lastUpdate > 80) {
          analyserRef.current.getByteFrequencyData(dataArray);

          // Get average volume level (0-1)
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const avg = sum / dataArray.length / 255;
          const level = Math.min(1, avg * 2.5); // Amplify a bit

          waveformRef.current = [...waveformRef.current, level].slice(-MAX_WAVEFORM_BARS);

          setState((prev) => ({
            ...prev,
            waveformData: [...waveformRef.current],
          }));

          lastUpdate = now;
        }

        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch (err) {
      console.warn("Could not start waveform analysis:", err);
    }
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - pausedDurationRef.current * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setState((prev) => ({ ...prev, duration: elapsed }));
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Clear previous recording
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];
      pausedDurationRef.current = 0;
      waveformRef.current = [];

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopTimer();

        // Stop waveform analysis
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);

          setState((prev) => ({
            ...prev,
            isRecording: false,
            isPaused: false,
            audioBlob: blob,
            audioUrl: url,
          }));
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        cleanup();
        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          error: "Erro ao gravar áudio",
        }));
      };

      mediaRecorder.start(100); // Collect data every 100ms

      // Start waveform analysis with real audio data
      startWaveformAnalysis(stream);

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
        error: null,
        waveformData: [],
      });

      startTimer();
    } catch (err) {
      console.error("Error starting recording:", err);

      let errorMessage = "Erro ao iniciar gravação";
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          errorMessage = "Permissão de microfone negada";
        } else if (err.name === "NotFoundError") {
          errorMessage = "Microfone não encontrado";
        }
      }

      setState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
    }
  }, [cleanup, startTimer, stopTimer, startWaveformAnalysis, state.audioUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      stopTimer();

      // Pause waveform
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      pausedDurationRef.current = state.duration;
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, [stopTimer, state.duration]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      startTimer();

      // Resume waveform analysis
      if (streamRef.current) {
        startWaveformAnalysis(streamRef.current);
      }

      setState((prev) => ({ ...prev, isPaused: false }));
    }
  }, [startTimer, startWaveformAnalysis]);

  const cancelRecording = useCallback(() => {
    cleanup();

    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      error: null,
      waveformData: [],
    });
  }, [cleanup, state.audioUrl]);

  const clearRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState((prev) => ({
      ...prev,
      audioBlob: null,
      audioUrl: null,
      duration: 0,
      waveformData: [],
    }));
  }, [state.audioUrl]);

  return {
    ...state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    clearRecording,
  };
}

// Helper function to format duration
export function formatAudioDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
