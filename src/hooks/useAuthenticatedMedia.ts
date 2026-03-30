// =============================================================================
// Hook: Authenticated Media URL for WAHA
// Extraído de MessageBubble.tsx para reutilização
// =============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { getWahaApiKeyForUrl } from '@/services/waha-api';

/**
 * For WAHA file URLs that require X-Api-Key authentication,
 * fetches the media via JS fetch() with the auth header
 * and converts the response to a blob: URL that <img>/<video>/<audio> can use.
 *
 * For non-WAHA URLs (Supabase storage, data:, blob:, external), returns as-is.
 */
export function useAuthenticatedUrl(
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
      if (url.includes('/api/files/')) return true;
      if (wahaApiUrl && url.startsWith(wahaApiUrl)) return true;
      return false;
    },
    [wahaApiUrl],
  );

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

    if (mediaUrl === prevUrlRef.current) return;
    prevUrlRef.current = mediaUrl;

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

/**
 * Normalize the raw message type from WAHA/database into canonical types.
 */
export function normalizeMessageType(raw: string | undefined): string {
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
 * Resolve a potentially-relative media URL to absolute.
 */
export function resolveMediaUrl(
  url: string | undefined | null,
  wahaApiUrl: string | undefined,
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  if (!wahaApiUrl) return url;
  let cleanUrl = url;
  if (!cleanUrl.startsWith('/')) cleanUrl = '/' + cleanUrl;
  if (!cleanUrl.startsWith('/api/files/')) cleanUrl = '/api/files' + cleanUrl;
  return `${wahaApiUrl}${cleanUrl}`;
}
