/**
 * Types para Meta Messenger & Instagram Direct
 */

export type MetaPlatform = 'facebook' | 'instagram';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'story_mention' | 'story_reply';

export type MessageDirection = 'incoming' | 'outgoing';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export type ConversationStatus = 'active' | 'archived' | 'deleted';

export interface QuickReply {
  content_type: 'text';
  title: string;
  payload: string;
  image_url?: string;
}

export interface MetaWebhookEvent {
  object: string;
  entry: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id: string; // Page ID
  time: number;
  messaging?: MetaMessagingEvent[];
  changes?: any[];
}

export interface MetaMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: MetaAttachment[];
    quick_reply?: {
      payload: string;
    };
  };
  delivery?: {
    mids: string[];
    watermark: number;
  };
  read?: {
    watermark: number;
  };
  postback?: {
    title: string;
    payload: string;
  };
  referral?: {
    source: string;
    type: string;
    ref: string;
  };
}

export interface MetaAttachment {
  type: 'image' | 'video' | 'audio' | 'file';
  payload: {
    url: string;
    is_reusable?: boolean;
  };
}

export interface GraphAPIResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
    previous?: string;
  };
}
