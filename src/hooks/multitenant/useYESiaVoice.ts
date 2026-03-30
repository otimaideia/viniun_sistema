import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenantContext } from '@/contexts/TenantContext';

type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

interface VoiceTranscript {
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export function useYESiaVoice() {
  const { tenant } = useTenantContext();
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup function
  const disconnect = useCallback(() => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
    setStatus('idle');
    setIsAISpeaking(false);
    setCurrentTranscript('');
  }, []);

  // Connect to OpenAI Realtime via WebRTC
  const connect = useCallback(async (voice: string = 'coral') => {
    try {
      setStatus('connecting');
      setError(null);

      // 1. Get ephemeral token from our edge function
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke(
        'ai-realtime-session',
        {
          body: {
            tenantId: tenant?.id,
            voice,
          },
        }
      );

      if (tokenError || !tokenData?.client_secret) {
        throw new Error(tokenError?.message || tokenData?.error || 'Failed to get session token');
      }

      const ephemeralKey = tokenData.client_secret.value;

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Set up audio output (AI voice)
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioElRef.current = audioEl;

      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];
      };

      // 4. Capture microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      pc.addTrack(stream.getTracks()[0]);

      // 5. Create data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        setStatus('connected');
      };

      dc.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleServerEvent(msg);
        } catch (e) {
          console.warn('[YESiaVoice] Failed to parse event:', e);
        }
      };

      dc.onerror = (event) => {
        console.error('[YESiaVoice] Data channel error:', event);
        setError('Erro na conexão de dados');
        setStatus('error');
      };

      dc.onclose = () => {
        setStatus('idle');
      };

      // 6. Create offer and connect
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 7. Send SDP to OpenAI
      const sdpResponse = await fetch(
        'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );

      if (!sdpResponse.ok) {
        throw new Error(`SDP negotiation failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      // Connection established - WebRTC handles audio automatically
    } catch (err: any) {
      console.error('[YESiaVoice] Connection error:', err);
      setError(err.message || 'Erro ao conectar voz');
      setStatus('error');
      disconnect();
    }
  }, [tenant, disconnect]);

  // Handle server events from data channel
  const handleServerEvent = useCallback((event: any) => {
    switch (event.type) {
      case 'session.created':
      case 'session.updated':
        console.log('[YESiaVoice] Session:', event.type);
        break;

      case 'input_audio_buffer.speech_started':
        setStatus('speaking');
        setIsAISpeaking(false);
        break;

      case 'input_audio_buffer.speech_stopped':
        setStatus('connected');
        break;

      case 'response.audio_transcript.delta':
        setCurrentTranscript(prev => prev + (event.delta || ''));
        setIsAISpeaking(true);
        setStatus('listening');
        break;

      case 'response.audio_transcript.done':
        if (event.transcript) {
          setTranscripts(prev => [...prev, {
            role: 'assistant',
            text: event.transcript,
            timestamp: new Date().toISOString(),
          }]);
        }
        setCurrentTranscript('');
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          setTranscripts(prev => [...prev, {
            role: 'user',
            text: event.transcript,
            timestamp: new Date().toISOString(),
          }]);
        }
        break;

      case 'response.done':
        setIsAISpeaking(false);
        setStatus('connected');
        break;

      case 'error':
        console.error('[YESiaVoice] API Error:', event.error);
        setError(event.error?.message || 'Erro na API');
        break;
    }
  }, []);

  // Send text message through voice channel
  const sendText = useCallback((text: string) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') return;

    dcRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    }));

    dcRef.current.send(JSON.stringify({
      type: 'response.create',
    }));

    setTranscripts(prev => [...prev, {
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    error,
    transcripts,
    currentTranscript,
    isAISpeaking,
    isConnected: status === 'connected' || status === 'speaking' || status === 'listening',
    connect,
    disconnect,
    sendText,
  };
}

export default useYESiaVoice;
