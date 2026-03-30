import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2,
  AlertCircle,
  X,
  ZoomIn,
  ExternalLink,
  Download,
  Mic,
  Check,
  CheckCheck,
  ChevronDown,
  Reply,
  Copy,
  Forward,
  Star,
  Trash2,
  Pin,
  PinOff,
  Pencil,
  Play,
  Pause,
  FileText,
  File,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { WhatsAppMensagem } from '@/types/whatsapp-chat';
import { formatMessageTime, safeText, linkifyContent } from './helpers';
import { cn } from '@/lib/utils';
import { getWahaApiKeyForUrl } from '@/services/waha-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageBubbleProps {
  message: WhatsAppMensagem;
  wahaApiUrl?: string;
  wahaApiKey?: string;
  onDelete?: (messageId: string, forEveryone: boolean) => Promise<void>;
  onReply?: (messageId: string) => void;
  onForward?: (messageId: string) => void;
  onPin?: (messageId: string, duration?: number) => void;
  onUnpin?: (messageId: string) => void;
  onReact?: (messageId: string, reaction: string) => void;
  onRetry?: (messageId: string) => void;
  onPhoneClick?: (phone: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers (internal)
// ---------------------------------------------------------------------------

/**
 * Normalize the raw message type coming from WAHA / the database into a
 * canonical set of types we render differently.
 */
function normalizeMessageType(raw: string | undefined): string {
  switch (raw?.toLowerCase()) {
    case 'chat':
    case 'conversation':
    case 'extendedtextmessage':
      return 'text';
    case 'vcard':
    case 'contactmessage':
      return 'contact';
    case 'ptt':
    case 'audiomessage':
      return 'audio';
    case 'imagemessage':
      return 'image';
    case 'videomessage':
      return 'video';
    case 'documentmessage':
      return 'document';
    case 'locationmessage':
      return 'location';
    case 'pollcreationmessage':
      return 'poll';
    default:
      return raw || 'text';
  }
}

/**
 * Resolve a potentially-relative media URL to an absolute one by prepending
 * the WAHA API base URL when necessary.
 */
function resolveMediaUrl(
  url: string | undefined | null,
  wahaApiUrl: string | undefined,
): string | undefined {
  if (!url) return undefined;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  if (!wahaApiUrl) return url;

  let cleanUrl = url;
  if (!cleanUrl.startsWith('/')) cleanUrl = '/' + cleanUrl;
  if (!cleanUrl.startsWith('/api/files/')) {
    cleanUrl = '/api/files' + cleanUrl;
  }
  return `${wahaApiUrl}${cleanUrl}`;
}

// ---------------------------------------------------------------------------
// Hook: fetch media URL with WAHA auth header, return blob URL
// ---------------------------------------------------------------------------

/**
 * For WAHA file URLs that require X-Api-Key authentication,
 * this hook fetches the media via JS fetch() with the auth header
 * and converts the response to a blob: URL that <img>/<video>/<audio> can use.
 *
 * For non-WAHA URLs (Supabase storage, data:, blob:, external), returns as-is.
 */
function useAuthenticatedUrl(
  mediaUrl: string | undefined,
  wahaApiUrl: string | undefined,
  wahaApiKey: string | undefined,
): { url: string | undefined; loading: boolean; error: boolean } {
  const [blobUrl, setBlobUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const prevUrlRef = useRef<string | undefined>(undefined);
  const createdBlobsRef = useRef<Set<string>>(new Set());

  const needsAuth = useCallback(
    (url: string | undefined): boolean => {
      if (!url) return false;
      // WAHA file URLs need auth: /api/files/... or full WAHA URL
      if (url.includes('/api/files/')) return true;
      if (wahaApiUrl && url.startsWith(wahaApiUrl)) return true;
      return false;
    },
    [wahaApiUrl],
  );

  // Determinar a API key correta baseado na URL (centralizado em waha-api.ts)
  const getApiKeyForUrl = useCallback(
    (url: string): string | undefined => {
      return getWahaApiKeyForUrl(url, wahaApiKey);
    },
    [wahaApiKey],
  );

  useEffect(() => {
    if (!mediaUrl) {
      setBlobUrl(undefined);
      setLoading(false);
      setError(false);
      return;
    }

    // Skip if URL hasn't changed
    if (mediaUrl === prevUrlRef.current) return;
    prevUrlRef.current = mediaUrl;

    // No auth needed: use URL directly
    if (!needsAuth(mediaUrl)) {
      setBlobUrl(mediaUrl);
      setLoading(false);
      setError(false);
      return;
    }

    const apiKey = getApiKeyForUrl(mediaUrl);
    if (!apiKey) {
      setBlobUrl(mediaUrl);
      setLoading(false);
      setError(false);
      return;
    }

    // Fetch with WAHA auth header (usando key correta por servidor)
    let cancelled = false;
    setLoading(true);
    setError(false);
    setBlobUrl(undefined);

    fetch(mediaUrl, {
      headers: { 'X-Api-Key': apiKey },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        createdBlobsRef.current.add(url);
        setBlobUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mediaUrl, needsAuth, getApiKeyForUrl]);

  // Cleanup all created blob URLs on unmount
  useEffect(() => {
    const blobsRef = createdBlobsRef;
    return () => {
      blobsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobsRef.current.clear();
    };
  }, []);

  return { url: blobUrl, loading, error };
}

// ---------------------------------------------------------------------------
// Sub-components for each media type
// ---------------------------------------------------------------------------

/** Image message with loading skeleton, error state & zoom dialog */
const ImageContent: React.FC<{
  mediaUrl: string;
  caption?: string | null;
  mediaUrlRaw?: string | null;
  wahaApiUrl?: string;
  wahaApiKey?: string;
}> = ({ mediaUrl, caption, mediaUrlRaw, wahaApiUrl, wahaApiKey }) => {
  const { url: resolvedUrl, loading: authLoading, error: authError } = useAuthenticatedUrl(mediaUrl, wahaApiUrl, wahaApiKey);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const hasError = error || authError;
  const isLoading = authLoading || (!loaded && !hasError);
  const displayUrl = resolvedUrl || mediaUrl;

  return (
    <>
      <div className="mb-1">
        {/* Loading skeleton */}
        {isLoading && !hasError && (
          <div className="w-[200px] h-[150px] bg-[#e9edef] rounded-lg flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#667781]" />
          </div>
        )}

        {/* Error state */}
        {hasError ? (
          <div className="w-[200px] h-[100px] bg-[#e9edef] rounded-lg flex flex-col items-center justify-center gap-2">
            <AlertCircle size={24} className="text-[#667781]" />
            <span className="text-xs text-[#667781]">Imagem nao disponivel</span>
          </div>
        ) : resolvedUrl ? (
          <div
            className={cn('relative cursor-pointer', !loaded && 'hidden')}
            onClick={() => setZoomOpen(true)}
          >
            <img
              src={resolvedUrl}
              alt="Imagem"
              className="max-w-[330px] max-h-[330px] rounded-lg"
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
            />
            <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5 cursor-pointer">
              <ZoomIn size={16} className="text-white" />
            </div>
          </div>
        ) : null}

        {/* Caption */}
        {caption && caption !== mediaUrlRaw && (
          <p className="text-sm text-[#111b21] mt-1 whitespace-pre-wrap break-words">
            {safeText(caption)}
          </p>
        )}
      </div>

      {/* Zoom dialog */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/95 border-none">
          <div className="relative flex items-center justify-center w-full h-full min-h-[300px]">
            {/* Close button */}
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute top-4 right-4 bg-white/10 border-none rounded-full p-2 cursor-pointer z-10"
            >
              <X size={24} className="text-white" />
            </button>

            {/* Open in new tab */}
            <button
              onClick={() => window.open(displayUrl, '_blank')}
              className="absolute top-4 right-16 bg-white/10 border-none rounded-full p-2 cursor-pointer z-10"
              title="Abrir em nova aba"
            >
              <ExternalLink size={24} className="text-white" />
            </button>

            {/* Full-size image */}
            <img
              src={displayUrl}
              alt="Imagem"
              className="max-w-[85vw] max-h-[85vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/** Video message — WhatsApp-style with thumbnail play overlay */
const VideoContent: React.FC<{
  mediaUrl: string;
  caption?: string | null;
  mediaUrlRaw?: string | null;
  wahaApiUrl?: string;
  wahaApiKey?: string;
}> = ({ mediaUrl, caption, mediaUrlRaw, wahaApiUrl, wahaApiKey }) => {
  const { url: resolvedUrl, loading, error } = useAuthenticatedUrl(mediaUrl, wahaApiUrl, wahaApiKey);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (loading) {
    return (
      <div className="w-[280px] h-[200px] bg-black/10 rounded-lg flex items-center justify-center mb-1">
        <Loader2 size={28} className="animate-spin text-white/70" />
      </div>
    );
  }

  if (error || !resolvedUrl) {
    return (
      <div className="w-[280px] h-[140px] bg-[#e9edef] rounded-lg flex flex-col items-center justify-center gap-2 mb-1">
        <AlertCircle size={24} className="text-[#667781]" />
        <span className="text-xs text-[#667781]">Video nao disponivel</span>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <div className="relative rounded-lg overflow-hidden bg-black max-w-[330px]">
        <video
          ref={videoRef}
          src={resolvedUrl}
          controls={isPlaying}
          preload="metadata"
          className="max-w-[330px] max-h-[300px] block"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            if (videoRef.current) setVideoDuration(videoRef.current.duration);
          }}
          onClick={() => {
            if (!isPlaying && videoRef.current) {
              videoRef.current.play();
            }
          }}
        />

        {/* Play overlay - shown when not playing */}
        {!isPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={() => videoRef.current?.play()}
          >
            <div className="w-[54px] h-[54px] rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
              <Play size={28} className="text-white ml-1" fill="white" />
            </div>

            {/* Duration badge */}
            {videoDuration > 0 && (
              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[11px] font-medium rounded px-1.5 py-0.5 backdrop-blur-sm">
                {formatDuration(videoDuration)}
              </div>
            )}
          </div>
        )}
      </div>

      {caption && caption !== mediaUrlRaw && (
        <p className="text-sm text-[#111b21] mt-1 whitespace-pre-wrap break-words">
          {safeText(caption)}
        </p>
      )}
    </div>
  );
};

/** Generate pseudo-random waveform bars based on a seed string */
function generateWaveform(seed: string, count: number = 40): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = ((hash << 5) - hash + i * 7) | 0;
    const val = Math.abs(hash % 100);
    bars.push(Math.max(12, Math.min(95, val)));
  }
  return bars;
}

/** Format seconds as m:ss */
function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Audio message — WhatsApp-style waveform player */
const AudioContent: React.FC<{
  mediaUrl: string;
  isSent: boolean;
  wahaApiUrl?: string;
  wahaApiKey?: string;
}> = ({ mediaUrl, isSent, wahaApiUrl, wahaApiKey }) => {
  const { url: resolvedUrl, loading, error } = useAuthenticatedUrl(mediaUrl, wahaApiUrl, wahaApiKey);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const waveform = useMemo(() => generateWaveform(mediaUrl || 'audio', 46), [mediaUrl]);

  const toggle = async () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch (err) {
        console.error('[Audio] Play failed:', err, 'src:', audioRef.current.src?.substring(0, 80));
        setPlaying(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const { currentTime: ct, duration: d } = audioRef.current;
    if (d > 0) {
      setProgress((ct / d) * 100);
      setCurrentTime(ct);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * audioRef.current.duration;
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const next = speeds[(speeds.indexOf(playbackRate) + 1) % speeds.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 min-w-[240px] py-1">
        <div className="w-[34px] h-[34px] rounded-full bg-[#667781]/20 flex items-center justify-center shrink-0">
          <Loader2 size={16} className="animate-spin text-[#667781]" />
        </div>
        <div className="flex-1">
          <div className="flex gap-[2px] items-end h-[28px]">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="w-[3px] rounded-full bg-[#667781]/20 animate-pulse"
                style={{ height: `${12 + (i % 5) * 4}px` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !resolvedUrl) {
    return (
      <div className="flex items-center gap-3 min-w-[240px] py-1">
        <div className="w-[34px] h-[34px] rounded-full bg-[#667781]/15 flex items-center justify-center shrink-0">
          <Mic size={16} className="text-[#667781]" />
        </div>
        <span className="text-xs text-[#667781]">Audio nao disponivel</span>
      </div>
    );
  }

  const progressIndex = Math.floor((progress / 100) * waveform.length);
  const displayTime = playing ? currentTime : duration;

  return (
    <div className="flex items-center gap-2.5 min-w-[240px] max-w-[360px] py-1.5">
      {/* Play/Pause button */}
      <button
        onClick={toggle}
        className={cn(
          'w-[36px] h-[36px] rounded-full border-none flex items-center justify-center cursor-pointer shrink-0 transition-colors shadow-sm',
          isSent
            ? 'bg-[#00a884] hover:bg-[#008f72] text-white'
            : 'bg-[#00a884] hover:bg-[#008f72] text-white',
        )}
      >
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </button>

      {/* Waveform + duration */}
      <div className="flex-1 min-w-0">
        <audio
          ref={audioRef}
          src={resolvedUrl}
          preload="metadata"
          onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (audioRef.current) setDuration(audioRef.current.duration);
          }}
          onError={(e) => {
            console.error('[Audio] Error loading:', (e.target as HTMLAudioElement).error, 'src:', resolvedUrl?.substring(0, 80));
          }}
          className="hidden"
        />

        {/* Waveform bars */}
        <div
          className="flex items-end gap-[2px] h-[30px] cursor-pointer"
          onClick={handleSeek}
        >
          {waveform.map((h, i) => (
            <div
              key={i}
              className={cn(
                'w-[3px] rounded-full transition-colors duration-100',
                i < progressIndex
                  ? (isSent ? 'bg-[#53bdeb]' : 'bg-[#00a884]')
                  : (isSent ? 'bg-[#b3d6c5]' : 'bg-[#c5dbca]'),
              )}
              style={{ height: `${(h / 100) * 30}px` }}
            />
          ))}
        </div>

        {/* Duration + speed */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-[#667781] tabular-nums">
            {formatDuration(displayTime)}
          </span>
          {playing && (
            <button
              onClick={cycleSpeed}
              className="text-[10px] font-semibold text-[#667781] bg-[#667781]/10 rounded-full px-1.5 py-0.5 border-none cursor-pointer hover:bg-[#667781]/20 transition-colors"
            >
              {playbackRate}x
            </button>
          )}
        </div>
      </div>

      {/* Mic icon - avatar style */}
      <div className={cn(
        'w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0',
        isSent ? 'bg-[#00a884]' : 'bg-[#dfe5e7]',
      )}>
        <Mic size={16} className={isSent ? 'text-white' : 'text-[#667781]'} />
      </div>
    </div>
  );
};

/** Document message — WhatsApp-style file card */
const DocumentContent: React.FC<{
  mediaUrl: string;
  filename: string;
  mimeType?: string;
  isSent: boolean;
  wahaApiUrl?: string;
  wahaApiKey?: string;
}> = ({ mediaUrl, filename, mimeType, isSent, wahaApiUrl, wahaApiKey }) => {
  const { url: resolvedUrl } = useAuthenticatedUrl(mediaUrl, wahaApiUrl, wahaApiKey);
  const displayUrl = resolvedUrl || mediaUrl;

  // Detect file extension for icon color
  const ext = filename?.split('.').pop()?.toUpperCase() || 'DOC';
  const extConfig: Record<string, { color: string; bg: string }> = {
    PDF:  { color: '#E53935', bg: '#FFEBEE' },
    DOC:  { color: '#1E88E5', bg: '#E3F2FD' },
    DOCX: { color: '#1E88E5', bg: '#E3F2FD' },
    XLS:  { color: '#43A047', bg: '#E8F5E9' },
    XLSX: { color: '#43A047', bg: '#E8F5E9' },
    PPT:  { color: '#FB8C00', bg: '#FFF3E0' },
    PPTX: { color: '#FB8C00', bg: '#FFF3E0' },
    TXT:  { color: '#546E7A', bg: '#ECEFF1' },
    ZIP:  { color: '#8E24AA', bg: '#F3E5F5' },
    RAR:  { color: '#8E24AA', bg: '#F3E5F5' },
  };
  const config = extConfig[ext] || { color: '#546E7A', bg: '#ECEFF1' };

  // Clean filename: remove path and query params
  const cleanName = filename?.split('/').pop()?.split('?')[0] || 'Documento';

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden min-w-[240px] max-w-[320px]',
        isSent ? 'bg-[#c1dfb4]' : 'bg-[#f0f0f0]',
      )}
    >
      {/* File card */}
      <div className="flex items-center gap-3 p-2.5">
        {/* File type icon */}
        <div
          className="w-[42px] h-[42px] rounded-lg flex flex-col items-center justify-center shrink-0"
          style={{ backgroundColor: config.bg }}
        >
          <FileText size={18} style={{ color: config.color }} />
          <span className="text-[8px] font-bold mt-0.5" style={{ color: config.color }}>
            {ext.slice(0, 4)}
          </span>
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-[#111b21] truncate leading-tight">
            {safeText(cleanName)}
          </div>
          <div className="text-[11px] text-[#667781] mt-0.5">
            {ext} {mimeType?.includes('pdf') ? '• Documento' : '• Arquivo'}
          </div>
        </div>

        {/* Download button */}
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 transition-colors',
            isSent
              ? 'bg-[#00a884]/15 hover:bg-[#00a884]/25 text-[#00a884]'
              : 'bg-[#667781]/10 hover:bg-[#667781]/20 text-[#667781]',
          )}
        >
          <Download size={16} />
        </a>
      </div>
    </div>
  );
};

/** Sticker */
const StickerContent: React.FC<{
  mediaUrl: string;
  wahaApiUrl?: string;
  wahaApiKey?: string;
}> = ({ mediaUrl, wahaApiUrl, wahaApiKey }) => {
  const { url: resolvedUrl } = useAuthenticatedUrl(mediaUrl, wahaApiUrl, wahaApiKey);

  if (!resolvedUrl) return null;

  return (
    <img
      src={resolvedUrl}
      alt="Sticker"
      className="max-w-[150px] max-h-[150px]"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
};

/** Location message with Google Maps link */
const LocationContent: React.FC<{
  message: WhatsAppMensagem;
  isSent: boolean;
}> = ({ message, isSent }) => {
  const hasCoords =
    message.latitude !== undefined && message.longitude !== undefined;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${message.latitude},${message.longitude}`
    : '#';

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block p-2 rounded-lg min-w-[200px] no-underline text-inherit',
        isSent ? 'bg-[#c8e6c9]' : 'bg-[#f5f5f5]',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#ef5350] rounded-lg flex items-center justify-center shrink-0">
          <span className="text-xl">{'\uD83D\uDCCD'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#111b21]">
            {safeText(message.locationTitle) || 'Localizacao'}
          </div>
          <div className="text-xs text-[#667781]">
            {safeText(message.locationAddress) ||
              (hasCoords
                ? `${message.latitude?.toFixed(6)}, ${message.longitude?.toFixed(6)}`
                : 'Ver no mapa')}
          </div>
        </div>
      </div>
    </a>
  );
};

/** Contact (vCard) message */
const ContactContent: React.FC<{
  message: WhatsAppMensagem;
  isSent: boolean;
}> = ({ message, isSent }) => (
  <div
    className={cn(
      'flex items-center gap-3 p-2 rounded-lg min-w-[200px]',
      isSent ? 'bg-[#c8e6c9]' : 'bg-[#f5f5f5]',
    )}
  >
    <div className="w-12 h-12 bg-[#00bcd4] rounded-full flex items-center justify-center shrink-0">
      <span className="text-xl">{'\uD83D\uDC64'}</span>
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-[#111b21]">
        {safeText(message.contactName) ||
          safeText(message.body?.replace('\uD83D\uDCC7 ', '')) ||
          'Contato'}
      </div>
      {message.contactPhone ? (
        <div className="text-xs text-[#667781]">{safeText(message.contactPhone)}</div>
      ) : message.vcard ? (
        <div className="text-xs text-[#667781]">Cartao de contato</div>
      ) : null}
    </div>
  </div>
);

/** Poll message */
const PollContent: React.FC<{
  message: WhatsAppMensagem;
  isSent: boolean;
}> = ({ message, isSent }) => (
  <div
    className={cn(
      'p-2 rounded-lg min-w-[220px] max-w-[280px]',
      isSent ? 'bg-[#c8e6c9]' : 'bg-[#f5f5f5]',
    )}
  >
    <div className="flex items-center gap-2 mb-2">
      <div className="w-8 h-8 bg-[#4caf50] rounded-lg flex items-center justify-center shrink-0">
        <span className="text-base">{'\uD83D\uDCCA'}</span>
      </div>
      <div className="text-sm font-medium text-[#111b21] flex-1">
        {safeText(message.pollName) ||
          safeText(message.body?.replace('\uD83D\uDCCA ', '')) ||
          'Enquete'}
      </div>
    </div>

    {message.pollOptions && message.pollOptions.length > 0 && (
      <div className="ml-10">
        {message.pollOptions.slice(0, 5).map((option, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded-full border-2 border-[#667781]" />
            <span className="text-xs text-[#667781]">{safeText(option)}</span>
          </div>
        ))}
        {message.pollOptions.length > 5 && (
          <div className="text-xs text-[#667781] ml-6">
            +{message.pollOptions.length - 5} opcoes
          </div>
        )}
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  wahaApiUrl,
  wahaApiKey,
  onDelete,
  onReply,
  onForward,
  onPin,
  onUnpin,
  onReact,
  onRetry,
  onPhoneClick,
}) => {
  const isSent = message.from_me;
  const isFailed = isSent && message.ack === 0;
  const isDeleted = message.is_deleted;
  const isRevoked = message.is_revoked;
  const isEdited = message.is_edited;
  const isPinned = message.is_pinned;
  const reactions = message.reactions;
  const quotedBody = message.quoted_message_body;
  const quotedId = message.quoted_message_id;

  const [isHovered, setIsHovered] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Normalize type
  const rawType =
    message.type || (message.media_type ? message.media_type : 'text');
  const messageType = normalizeMessageType(rawType);

  // Resolve media URL: preferir storage_path (permanente) sobre media_url (pode expirar)
  const storagePath = (message as any).storage_path;
  const rawMediaUrl = (storagePath && storagePath !== 'media_unavailable') ? storagePath : message.media_url;
  const mediaUrl = resolveMediaUrl(rawMediaUrl, wahaApiUrl);

  // Skip rendering entirely for empty messages (no body, no media, no special type)
  const hasBody = !!(message.body && message.body.trim());
  const hasMedia = !!mediaUrl;
  const hasCaption = !!(message.caption && message.caption.trim());
  const isSpecialType = ['location', 'contact', 'poll', 'vcard'].includes(messageType);
  const isEmpty = !hasBody && !hasMedia && !hasCaption && !isSpecialType && !isDeleted && !isRevoked;

  if (isEmpty) return null;

  // ------ Action handlers ------

  const handleCopy = async () => {
    if (!message.body) return;
    try {
      await navigator.clipboard.writeText(message.body);
      toast.success('Mensagem copiada!');
    } catch {
      toast.error('Erro ao copiar mensagem');
    }
  };

  const handleDelete = async (forEveryone: boolean) => {
    if (!onDelete) return;
    try {
      await onDelete(message.message_id || message.id, forEveryone);
      toast.success(
        forEveryone
          ? 'Mensagem apagada para todos'
          : 'Mensagem apagada para voce',
      );
    } catch {
      toast.error('Erro ao apagar mensagem');
    }
  };

  // ------ Media rendering ------

  const renderMedia = () => {
    switch (messageType) {
      case 'image':
        if (mediaUrl) {
          return (
            <ImageContent
              mediaUrl={mediaUrl}
              caption={message.body}
              mediaUrlRaw={message.media_url}
              wahaApiUrl={wahaApiUrl}
              wahaApiKey={wahaApiKey}
            />
          );
        }
        break;

      case 'video':
        if (mediaUrl) {
          return (
            <VideoContent
              mediaUrl={mediaUrl}
              caption={message.body}
              mediaUrlRaw={message.media_url}
              wahaApiUrl={wahaApiUrl}
              wahaApiKey={wahaApiKey}
            />
          );
        }
        break;

      case 'audio':
        if (mediaUrl) {
          return <AudioContent mediaUrl={mediaUrl} isSent={isSent} wahaApiUrl={wahaApiUrl} wahaApiKey={wahaApiKey} />;
        }
        break;

      case 'document':
        if (mediaUrl) {
          return (
            <DocumentContent
              mediaUrl={mediaUrl}
              filename={message.media_filename || message.body || 'Documento'}
              mimeType={message.media_mime_type ?? undefined}
              isSent={isSent}
              wahaApiUrl={wahaApiUrl}
              wahaApiKey={wahaApiKey}
            />
          );
        }
        break;

      case 'sticker':
        if (mediaUrl) {
          return <StickerContent mediaUrl={mediaUrl} wahaApiUrl={wahaApiUrl} wahaApiKey={wahaApiKey} />;
        }
        break;

      case 'location':
        return <LocationContent message={message} isSent={isSent} />;

      case 'contact':
        return <ContactContent message={message} isSent={isSent} />;

      case 'poll':
        return <PollContent message={message} isSent={isSent} />;
    }

    // Default: text or unknown media type fallback
    if (message.body) {
      return (
        <p className="text-[13.6px] leading-[19px] text-[#111b21] mb-0.5 whitespace-pre-wrap break-words">
          {onPhoneClick
            ? linkifyContent(safeText(message.body), onPhoneClick)
            : safeText(message.body)}
        </p>
      );
    }

    if (message.media_type) {
      return (
        <p className="text-sm text-[#667781] italic mb-0.5">
          {'\uD83D\uDCCE'} {message.media_type}
        </p>
      );
    }

    return null;
  };

  // ------ Read receipts ------

  const renderAck = () => {
    if (!isSent) return null;
    if (isFailed) {
      return <AlertCircle size={14} className="text-red-500" />;
    }
    if (message.ack === 3) {
      return <CheckCheck size={14} className="text-[#53bdeb]" />;
    }
    if (message.ack === 2) {
      return <CheckCheck size={14} />;
    }
    return <Check size={14} />;
  };

  // ------ Render ------

  return (
    <div
      className={cn(
        'max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] mb-2',
        isSent ? 'ml-auto' : 'mr-auto',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isDropdownOpen) setIsHovered(false);
      }}
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        if (['VIDEO', 'IMG', 'AUDIO'].includes(target.tagName)) {
          e.preventDefault();
        }
      }}
    >
      {/* Bubble */}
      <div
        className={cn(
          'relative px-[9px] py-[6px] pb-[8px] break-words shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]',
          isSent
            ? 'bg-[#d9fdd3] rounded-[7.5px] rounded-tr-none'
            : 'bg-white rounded-[7.5px] rounded-tl-none',
          isDeleted && 'opacity-60 border border-dashed border-red-600',
        )}
      >
        {/* Hover dropdown menu - WhatsApp Web style */}
        {(isHovered || isDropdownOpen) && !isDeleted && (
          <DropdownMenu
            open={isDropdownOpen}
            onOpenChange={(open) => {
              setIsDropdownOpen(open);
              if (!open) setIsHovered(false);
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'absolute top-1 right-1 border-none rounded p-0.5 cursor-pointer flex items-center justify-center z-10 shadow-sm',
                  isSent
                    ? 'bg-[#d9fdd3]/95'
                    : 'bg-white/95',
                )}
              >
                <ChevronDown size={16} className="text-[#667781]" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align={isSent ? 'end' : 'start'}
              className="w-48"
            >
              {/* Reply */}
              <DropdownMenuItem
                onClick={() => {
                  if (onReply) onReply(message.message_id || message.id);
                  else toast.info('Responder em breve!');
                }}
              >
                <Reply className="h-4 w-4 mr-2" />
                Responder
              </DropdownMenuItem>

              {/* Copy */}
              {message.body && (
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </DropdownMenuItem>
              )}

              {/* Forward */}
              <DropdownMenuItem
                onClick={() => {
                  if (onForward) onForward(message.message_id || message.id);
                  else toast.info('Encaminhar em breve!');
                }}
              >
                <Forward className="h-4 w-4 mr-2" />
                Encaminhar
              </DropdownMenuItem>

              {/* Pin/Unpin */}
              {onPin && !isPinned && (
                <DropdownMenuItem
                  onClick={() => onPin(message.message_id || message.id)}
                >
                  <Pin className="h-4 w-4 mr-2" />
                  Fixar mensagem
                </DropdownMenuItem>
              )}
              {onUnpin && isPinned && (
                <DropdownMenuItem
                  onClick={() => onUnpin(message.message_id || message.id)}
                >
                  <PinOff className="h-4 w-4 mr-2" />
                  Desafixar mensagem
                </DropdownMenuItem>
              )}

              {/* React */}
              {onReact && (
                <DropdownMenuItem asChild>
                  <div className="flex flex-col gap-1 px-2 py-1">
                    <span className="text-xs text-muted-foreground mb-1">Reagir</span>
                    <div className="flex gap-1 flex-wrap">
                      {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                        <button
                          key={emoji}
                          className="text-lg hover:scale-125 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReact(message.message_id || message.id, emoji);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </DropdownMenuItem>
              )}

              {/* Favorite */}
              <DropdownMenuItem
                onClick={() => toast.info('Favoritar em breve!')}
              >
                <Star className="h-4 w-4 mr-2" />
                Favoritar
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Delete for me */}
              {onDelete && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleDelete(false)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Apagar para mim
                  </DropdownMenuItem>

                  {/* Delete for everyone - only for sent messages */}
                  {isSent && (
                    <DropdownMenuItem
                      onClick={() => handleDelete(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Apagar para todos
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Deleted message banner */}
        {isDeleted && (
          <div className="bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-t -mt-1.5 -mx-3 mb-1 text-center flex items-center justify-center gap-1">
            <span>{'\uD83D\uDDD1\uFE0F'}</span>
            <span>MENSAGEM APAGADA</span>
          </div>
        )}

        {/* Revoked message banner */}
        {isRevoked && !isDeleted && (
          <div className="text-[12px] text-[#667781] italic flex items-center gap-1">
            <span>🚫</span>
            <span>Esta mensagem foi apagada</span>
          </div>
        )}

        {/* Pinned indicator */}
        {isPinned && (
          <div className="absolute -top-2 right-2 text-[10px] text-[#00a884] flex items-center gap-0.5">
            <Pin className="h-2.5 w-2.5" />
            <span>Fixada</span>
          </div>
        )}

        {/* Nome do atendente (multi-atendente) */}
        {isSent && message.sender_name && (
          <span className="text-[10px] font-semibold text-[#076037] block mb-0.5 leading-tight">
            {message.sender_name}
          </span>
        )}

        {/* Quoted message / reply preview */}
        {quotedBody && (
          <div
            className={cn(
              'rounded-[7.5px] px-2.5 py-1.5 mb-1 border-l-[4px] cursor-pointer text-[13px] leading-[18px]',
              isSent
                ? 'bg-[#c8f0c0] border-l-[#06cf9c]'
                : 'bg-[#f0f0f0] border-l-[#6bcbef]',
            )}
            title="Mensagem citada"
          >
            <span className="line-clamp-2 text-[#667781] break-words">
              {quotedBody}
            </span>
          </div>
        )}

        {/* Media / text content */}
        {renderMedia()}

        {/* Timestamp + read receipts + edited indicator */}
        <div className="text-[11px] text-[#667781] text-right flex justify-end items-center gap-1 mt-0.5 -mb-0.5">
          {isEdited && (
            <span className="text-[10px] italic mr-1 flex items-center gap-0.5">
              <Pencil className="h-2.5 w-2.5" />
              editada
            </span>
          )}
          {formatMessageTime(message.timestamp)}
          {renderAck()}
        </div>

        {/* Failed message retry button */}
        {isFailed && onRetry && (
          <button
            onClick={() => onRetry(message.message_id || message.id)}
            className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 mt-0.5 transition-colors"
          >
            <AlertCircle className="h-3 w-3" />
            <span>Falha no envio. Toque para reenviar</span>
          </button>
        )}

        {/* Reactions display */}
        {reactions && Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(reactions).map(([emoji, users]) =>
              users.length > 0 ? (
                <span
                  key={emoji}
                  className="inline-flex items-center gap-0.5 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-full px-1.5 py-0.5 text-[12px] shadow-sm cursor-default"
                  title={`${users.length} reação(ões)`}
                >
                  {emoji}
                  {users.length > 1 && (
                    <span className="text-[10px] text-gray-500">{users.length}</span>
                  )}
                </span>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
