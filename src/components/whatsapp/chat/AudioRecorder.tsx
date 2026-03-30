import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAudioRecorderAdapter, formatAudioDuration } from "@/hooks/useAudioRecorderAdapter";
import {
  Mic,
  Pause,
  Play,
  Trash2,
  Send,
  Loader2,
  X,
  StopCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onSend: (audioBlob: Blob) => Promise<{ success: boolean; error?: string }>;
  disabled?: boolean;
  onRecordingChange?: (isRecording: boolean) => void;
}

export function AudioRecorder({ onSend, disabled, onRecordingChange }: AudioRecorderProps) {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    error,
    waveformData,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    clearRecording,
  } = useAudioRecorderAdapter();

  const [isSending, setIsSending] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);

  // Notify parent when recorder is "active" (recording OR preview mode)
  const isActive = isRecording || !!(audioBlob && audioUrl);
  useEffect(() => {
    onRecordingChange?.(isActive);
  }, [isActive, onRecordingChange]);

  // Auto-scroll waveform to the right during recording
  useEffect(() => {
    if (isRecording && waveformContainerRef.current) {
      waveformContainerRef.current.scrollLeft = waveformContainerRef.current.scrollWidth;
    }
  }, [waveformData, isRecording]);

  // Handle audio playback
  useEffect(() => {
    if (audioUrl && !audioRef.current) {
      audioRef.current = new Audio(audioUrl);

      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
        setPlaybackTime(0);
      };
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setPlaybackProgress(isNaN(progress) ? 0 : progress);
          setPlaybackTime(Math.floor(audioRef.current.currentTime));
        }
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;

    setIsSending(true);
    try {
      const result = await onSend(audioBlob);
      if (result.success) {
        clearRecording();
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    cancelRecording();
    setIsPlaying(false);
    setPlaybackProgress(0);
    setPlaybackTime(0);
  };

  // ─── RECORDING MODE ────────────────────────────────────────────────────────
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 w-full">
        {/* Delete / Cancel button */}
        <button
          onClick={handleCancel}
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
          title="Cancelar gravação"
        >
          <Trash2 className="h-5 w-5 text-red-500" />
        </button>

        {/* Recording bar - WhatsApp style */}
        <div className="flex-1 flex items-center gap-3 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200 min-h-[48px]">
          {/* Red pulsing dot */}
          <div className="shrink-0 flex items-center gap-2">
            <div className={cn(
              "w-2.5 h-2.5 rounded-full bg-red-500",
              !isPaused && "animate-pulse"
            )} />
            <span className="text-sm font-mono font-medium text-gray-700 min-w-[42px]">
              {formatAudioDuration(duration)}
            </span>
          </div>

          {/* Real-time waveform bars */}
          <div
            ref={waveformContainerRef}
            className="flex-1 flex items-center gap-[2px] h-8 overflow-hidden"
          >
            {waveformData.length === 0 ? (
              // Initial placeholder bars
              [...Array(30)].map((_, i) => (
                <div
                  key={`placeholder-${i}`}
                  className="w-[3px] shrink-0 rounded-full bg-gray-200"
                  style={{ height: '4px' }}
                />
              ))
            ) : (
              waveformData.map((level, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-[3px] shrink-0 rounded-full transition-all duration-75",
                    isPaused ? "bg-gray-300" : "bg-[#25D366]"
                  )}
                  style={{
                    height: `${Math.max(4, level * 28)}px`,
                  }}
                />
              ))
            )}
          </div>

          {/* Pause/Resume */}
          <button
            onClick={isPaused ? resumeRecording : pauseRecording}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            title={isPaused ? "Continuar" : "Pausar"}
          >
            {isPaused ? (
              <Mic className="h-4 w-4 text-red-500" />
            ) : (
              <Pause className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>

        {/* Stop and go to preview */}
        <button
          onClick={stopRecording}
          className="shrink-0 h-12 w-12 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white shadow-md transition-colors"
          title="Parar gravação"
        >
          <StopCircle className="h-6 w-6" />
        </button>
      </div>
    );
  }

  // ─── PREVIEW MODE (after recording) ────────────────────────────────────────
  if (audioBlob && audioUrl) {
    return (
      <div className="flex items-center gap-2 w-full">
        {/* Delete */}
        <button
          onClick={handleCancel}
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
          disabled={isSending}
          title="Descartar áudio"
        >
          <Trash2 className="h-5 w-5 text-red-500" />
        </button>

        {/* Playback bar - WhatsApp style */}
        <div className="flex-1 flex items-center gap-3 bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200 min-h-[48px]">
          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white transition-colors"
            disabled={isSending}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>

          {/* Waveform with progress overlay */}
          <div className="flex-1 relative h-8">
            {/* Waveform bars */}
            <div className="flex items-center gap-[2px] h-full overflow-hidden">
              {waveformData.length > 0 ? (
                waveformData.map((level, i) => {
                  const barPercent = (i / waveformData.length) * 100;
                  const isPlayed = barPercent <= playbackProgress;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "w-[3px] shrink-0 rounded-full transition-colors duration-100",
                        isPlayed ? "bg-[#25D366]" : "bg-gray-300"
                      )}
                      style={{
                        height: `${Math.max(4, level * 28)}px`,
                      }}
                    />
                  );
                })
              ) : (
                // Fallback: simple progress bar
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#25D366] transition-all duration-100"
                    style={{ width: `${playbackProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Duration */}
          <span className="text-xs font-mono font-medium text-gray-500 min-w-[42px] text-right">
            {isPlaying ? formatAudioDuration(playbackTime) : formatAudioDuration(duration)}
          </span>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          className={cn(
            "shrink-0 h-12 w-12 flex items-center justify-center rounded-full shadow-md transition-colors",
            isSending
              ? "bg-gray-400"
              : "bg-[#25D366] hover:bg-[#20BD5A]"
          )}
          disabled={isSending}
          title="Enviar áudio"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Send className="h-5 w-5 text-white" />
          )}
        </button>
      </div>
    );
  }

  // ─── DEFAULT STATE - Mic button ────────────────────────────────────────────
  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0"
      onClick={startRecording}
      disabled={disabled}
      title={error || "Gravar áudio"}
    >
      <Mic className={cn("h-5 w-5", error ? "text-destructive" : "text-muted-foreground")} />
    </Button>
  );
}
