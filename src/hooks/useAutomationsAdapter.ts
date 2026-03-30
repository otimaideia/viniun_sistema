// =============================================================================
// USE AUTOMATIONS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para automações de WhatsApp
// SISTEMA 100% MT - Usa useAutomations internamente
//
// =============================================================================

import { useAutomationsMT } from './multitenant/useAutomationsMT';

// Types duplicados para evitar problema de export/import com Vite
export type AutomationType = 'welcome' | 'away' | 'business_hours';

export const AUTOMATION_TYPE_LABELS: Record<AutomationType, string> = {
  welcome: 'Boas-vindas',
  away: 'Ausente',
  business_hours: 'Fora do Horário',
};

export const AUTOMATION_TYPE_DESCRIPTIONS: Record<AutomationType, string> = {
  welcome: 'Enviada quando um contato inicia uma nova conversa',
  away: 'Enviada quando você está ausente ou ocupado',
  business_hours: 'Enviada fora do horário comercial',
};

export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

export interface WhatsAppAutomation {
  id: string;
  session_id: string;
  type: AutomationType;
  name: string;
  message: string;
  is_active: boolean;
  delay_seconds: number;
  only_first_message: boolean;
  schedule_enabled: boolean;
  schedule_days: number[] | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomationInput {
  session_id: string;
  type: AutomationType;
  name: string;
  message: string;
  delay_seconds?: number;
  only_first_message?: boolean;
  schedule_enabled?: boolean;
  schedule_days?: number[];
  schedule_start_time?: string;
  schedule_end_time?: string;
}

export interface UpdateAutomationInput {
  id: string;
  name?: string;
  message?: string;
  delay_seconds?: number;
  only_first_message?: boolean;
  schedule_enabled?: boolean;
  schedule_days?: number[];
  schedule_start_time?: string;
  schedule_end_time?: string;
}

// -----------------------------------------------------------------------------
// Adapter Principal - 100% MT
// -----------------------------------------------------------------------------

export function useAutomationsAdapter(options: Parameters<typeof useAutomationsMT>[0]) {
  const hook = useAutomationsMT(options);
  return { ...hook, _mode: 'mt' as const };
}

export default useAutomationsAdapter;
