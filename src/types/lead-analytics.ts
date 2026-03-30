// Types for Lead Analytics Dashboard

export type AnalyticsPeriod = 'hoje' | '7d' | '30d' | '90d';

export interface AnalyticsPeriodOption {
  label: string;
  value: AnalyticsPeriod;
  days: number;
}

export const ANALYTICS_PERIODS: AnalyticsPeriodOption[] = [
  { label: 'Hoje', value: 'hoje', days: 1 },
  { label: '7 dias', value: '7d', days: 7 },
  { label: '30 dias', value: '30d', days: 30 },
  { label: '90 dias', value: '90d', days: 90 },
];

// Heatmap
export interface HeatmapCell {
  hour: number;
  dow: number;
  total: number;
  recebidas: number;
  enviadas: number;
}

// Engagement funnel
export interface EngagementBucket {
  level: string;
  label: string;
  count: number;
  percentage: number;
}

// Service demand
export interface ServiceDemand {
  servico: string;
  count: number;
  percentage: number;
}

// FAQ
export interface FAQItem {
  pergunta: string;
  count: number;
}

// Keyword mentions
export interface KeywordMention {
  termo: string;
  mencoes: number;
}

// Response metrics
export interface ResponseMetrics {
  taxa_resposta: number;
  tempo_medio_minutos: number;
  sem_resposta: number;
  msgs_noturnas: number;
  total_conversas: number;
  conversas_respondidas: number;
}

// Lead funnel distribution
export interface FunnelItem {
  status: string;
  count: number;
  percentage: number;
}

// Monthly trend
export interface MonthlyTrend {
  month: string;
  count: number;
}

// ICP data
export interface ICPData {
  topCities: { name: string; count: number }[];
  genderDistribution: { gender: string; count: number }[];
  topChannels: { channel: string; count: number }[];
}

// Conversation example for presentations
export interface ConversationMessage {
  body: string;
  fromMe: boolean;
  timestamp?: string;
  contactName?: string;
}

export interface ConversationExampleData {
  title: string;
  isGood: boolean;
  messages: ConversationMessage[];
  whatHappened: string;
  whatShouldHappen: string;
  lesson: string;
}

// Main aggregated metrics
export interface LeadAnalyticsMetrics {
  // KPIs
  totalLeads: number;
  newLeadsPeriod: number;
  responseRate: number;
  leadsWithoutResponse: number;
  nightMessages: number;
  conversionRate: number;
  totalConversations: number;

  // Charts data
  funnelDistribution: FunnelItem[];
  monthlyTrend: MonthlyTrend[];
  serviceDemand: ServiceDemand[];
  engagementFunnel: EngagementBucket[];
  heatmap: HeatmapCell[];
  topProcedures: KeywordMention[];
  topFAQ: FAQItem[];
  keywordMentions: KeywordMention[];

  // ICP
  icpData: ICPData;
}
