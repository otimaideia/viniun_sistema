// Card de Sessão WhatsApp - YESlaser
import React from 'react';
import { MessageCircle, Phone, Plus, Building2, MessageSquare, CheckCheck, Clock, Download, Trash2, Loader2, StopCircle, Webhook, CheckCircle2, UserPlus } from 'lucide-react';
import type { WhatsAppSession } from '@/types/whatsapp';

interface SessionStats {
  conversationCount: number;
  unreadCount: number;
  todayCount: number;       // Conversas de hoje
  readTodayCount: number;   // Lidas hoje
  pendingCount: number;     // Faltam atender (não lidas)
  leadsCount: number;       // Leads criados
}

interface SyncProgress {
  isRunning: boolean;
  current: number;
  total: number;
  currentChat: string;
}

interface SessionCardProps {
  session: WhatsAppSession;
  stats: SessionStats;
  franquiaName?: string;    // Nome da franquia vinculada
  activeModulos?: string[]; // Lista de nomes dos módulos ativos
  onOpenConversations: (sessionId: string) => void;
  // Novos handlers para admin
  onSyncConversas?: (sessionId: string) => void;
  onClearData?: (sessionId: string) => void;
  onStopSync?: (sessionId: string) => void;
  onConfigureWebhook?: (sessionId: string, sessionName: string) => void;
  isAdmin?: boolean;
  syncProgress?: SyncProgress;
  isClearingData?: boolean;
  isConfiguringWebhook?: boolean;
  webhookConfigured?: boolean;
}

// Status badge component
const StatusBadge: React.FC<{ status: WhatsAppSession['status'] }> = ({ status }) => {
  const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; dotColor: string }> = {
    connected: { label: 'Conectado', bgColor: '#e8f5e9', textColor: '#2e7d32', dotColor: '#4caf50' },
    working: { label: 'Conectado', bgColor: '#e8f5e9', textColor: '#2e7d32', dotColor: '#4caf50' }, // Alias para connected
    qr_code: { label: 'Aguardando QR', bgColor: '#fff3e0', textColor: '#e65100', dotColor: '#ff9800' },
    connecting: { label: 'Conectando...', bgColor: '#e3f2fd', textColor: '#1565c0', dotColor: '#2196f3' },
    disconnected: { label: 'Desconectado', bgColor: '#ffebee', textColor: '#c62828', dotColor: '#f44336' },
    failed: { label: 'Falha', bgColor: '#ffebee', textColor: '#c62828', dotColor: '#f44336' },
  };

  const config = statusConfig[status] || statusConfig.disconnected;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: config.dotColor,
        }}
      />
      {config.label}
    </span>
  );
};

// Formatar número de telefone para exibição
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // Remove @c.us se existir
  const cleaned = phone.replace('@c.us', '');
  // Formata: 55 13 99700-0000
  if (cleaned.length >= 12) {
    const ddi = cleaned.slice(0, 2);
    const ddd = cleaned.slice(2, 4);
    const part1 = cleaned.slice(4, 9);
    const part2 = cleaned.slice(9);
    return `+${ddi} (${ddd}) ${part1}-${part2}`;
  }
  return cleaned;
};

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  stats,
  franquiaName,
  activeModulos,
  onOpenConversations,
  onSyncConversas,
  onClearData,
  onStopSync,
  onConfigureWebhook,
  isAdmin,
  syncProgress,
  isClearingData,
  isConfiguringWebhook,
  webhookConfigured,
}) => {
  const displayName = session.display_name || session.session_name || 'Sessão WhatsApp';
  const phoneNumber = session.phone_number || '';
  // Aceitar 'connected' (Supabase) ou 'working' (WAHA)
  const isConnected = session.status === 'connected' || session.status === 'working';

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        minWidth: '280px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* WhatsApp Icon */}
      <div
        style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: '#25D366',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)',
        }}
      >
        <MessageCircle size={35} color="#fff" strokeWidth={1.5} />
      </div>

      {/* Session Name */}
      <h3
        style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: '#1a1a1a',
          textAlign: 'center',
        }}
      >
        {displayName}
      </h3>

      {/* Phone Number */}
      {phoneNumber && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#444',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <Phone size={14} color="#25D366" />
          <span>{formatPhoneNumber(phoneNumber)}</span>
        </div>
      )}

      {/* Franquia vinculada */}
      {franquiaName && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#666',
            fontSize: '12px',
            background: '#f5f5f5',
            padding: '4px 10px',
            borderRadius: '12px',
          }}
        >
          <Building2 size={12} />
          <span>{franquiaName}</span>
        </div>
      )}

      {/* Módulos ativos */}
      {activeModulos && activeModulos.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            justifyContent: 'center',
            marginTop: '2px',
          }}
        >
          {activeModulos.slice(0, 4).map((modulo) => (
            <span
              key={modulo}
              style={{
                fontSize: '10px',
                background: '#e3f2fd',
                color: '#1976d2',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 500,
              }}
            >
              {modulo}
            </span>
          ))}
          {activeModulos.length > 4 && (
            <span
              style={{
                fontSize: '10px',
                color: '#666',
                padding: '2px 4px',
              }}
            >
              +{activeModulos.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Status Badge */}
      <StatusBadge status={session.status} />

      {/* Engine Badge (NOWEB / GOWS / WEBJS) */}
      {session.engine && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'monospace',
            ...(session.engine === 'NOWEB'
              ? { background: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe' }
              : session.engine === 'GOWS'
              ? { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd' }
              : { background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }
            ),
          }}
        >
          {session.engine}
        </span>
      )}

      {/* Métricas Detalhadas */}
      <div
        style={{
          width: '100%',
          marginTop: '8px',
          paddingTop: '12px',
          borderTop: '1px solid #f0f0f0',
        }}
      >
        {/* Linha 1: Hoje e Total */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              background: '#e3f2fd',
              borderRadius: '8px',
              padding: '10px',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
              <MessageSquare size={14} color="#1976d2" />
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#1976d2' }}>
                {stats.todayCount}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>
              Hoje
            </div>
          </div>
          <div
            style={{
              background: '#f3e5f5',
              borderRadius: '8px',
              padding: '10px',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
              <MessageCircle size={14} color="#7b1fa2" />
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#7b1fa2' }}>
                {stats.conversationCount}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>
              Total
            </div>
          </div>
        </div>

        {/* Linha 2: Lidas e Pendentes */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              background: '#e8f5e9',
              borderRadius: '8px',
              padding: '10px',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
              <CheckCheck size={14} color="#2e7d32" />
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#2e7d32' }}>
                {stats.readTodayCount}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>
              Lidas
            </div>
          </div>
          <div
            style={{
              background: stats.pendingCount > 0 ? '#fff3e0' : '#f5f5f5',
              borderRadius: '8px',
              padding: '10px',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '2px' }}>
              <Clock size={14} color={stats.pendingCount > 0 ? '#e65100' : '#999'} />
              <span style={{ fontSize: '18px', fontWeight: 600, color: stats.pendingCount > 0 ? '#e65100' : '#999' }}>
                {stats.pendingCount}
              </span>
            </div>
            <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>
              Pendentes
            </div>
          </div>
        </div>

        {/* Linha 3: Leads Criados */}
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px',
            padding: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '2px' }}>
            <UserPlus size={16} color="#fff" />
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>
              {stats.leadsCount}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#fff', textTransform: 'uppercase', fontWeight: 600 }}>
            Leads Criados
          </div>
        </div>
      </div>

      {/* Open Conversations Button */}
      <button
        onClick={() => onOpenConversations(session.id)}
        disabled={!isConnected}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '8px',
          background: isConnected ? '#25D366' : '#e0e0e0',
          color: isConnected ? '#fff' : '#999',
          fontSize: '14px',
          fontWeight: 500,
          cursor: isConnected ? 'pointer' : 'not-allowed',
          marginTop: '8px',
          width: '100%',
          justifyContent: 'center',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          if (isConnected) {
            e.currentTarget.style.background = '#1fb855';
          }
        }}
        onMouseLeave={(e) => {
          if (isConnected) {
            e.currentTarget.style.background = '#25D366';
          }
        }}
      >
        <MessageCircle size={16} />
        Abrir Conversas
      </button>

      {/* Botão Ativar Webhook - VISÍVEL PARA TODAS AS ROLES */}
      {isConnected && (
        <button
          onClick={() => onConfigureWebhook?.(session.id, session.session_name || '')}
          disabled={isConfiguringWebhook}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            border: webhookConfigured ? '1px solid #16a34a' : '1px solid #7c3aed',
            borderRadius: '6px',
            background: webhookConfigured ? '#f0fdf4' : '#f5f3ff',
            color: webhookConfigured ? '#16a34a' : '#7c3aed',
            fontSize: '12px',
            fontWeight: 500,
            cursor: isConfiguringWebhook ? 'not-allowed' : 'pointer',
            width: '100%',
            marginTop: '8px',
            opacity: isConfiguringWebhook ? 0.5 : 1,
          }}
        >
          {isConfiguringWebhook ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Configurando...
            </>
          ) : webhookConfigured ? (
            <>
              <CheckCircle2 size={14} />
              Webhook Ativo
            </>
          ) : (
            <>
              <Webhook size={14} />
              Ativar Webhook
            </>
          )}
        </button>
      )}

      {/* Botões Admin - Sincronizar e Limpar (apenas para sessões conectadas e admin) */}
      {isAdmin && isConnected && (
        <div style={{ width: '100%', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Barra de progresso da sincronização */}
          {syncProgress?.isRunning ? (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                  {syncProgress.currentChat}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#1976d2' }}>
                  {syncProgress.current}/{syncProgress.total}
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: '#1976d2',
                    borderRadius: '3px',
                    width: syncProgress.total > 0 ? `${(syncProgress.current / syncProgress.total) * 100}%` : '0%',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <button
                onClick={() => onStopSync?.(session.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginTop: '6px',
                  width: '100%',
                }}
              >
                <StopCircle size={14} />
                Parar
              </button>
            </div>
          ) : (
            <>
              {/* Botão Sincronizar */}
              <button
                onClick={() => onSyncConversas?.(session.id)}
                disabled={isClearingData}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  background: '#fff',
                  color: '#333',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: isClearingData ? 'not-allowed' : 'pointer',
                  width: '100%',
                  opacity: isClearingData ? 0.5 : 1,
                }}
              >
                <Download size={14} />
                Sincronizar Conversas
              </button>

              {/* Botão Limpar Dados */}
              <button
                onClick={() => onClearData?.(session.id)}
                disabled={isClearingData}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: isClearingData ? '#fca5a5' : '#dc2626',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: isClearingData ? 'not-allowed' : 'pointer',
                  width: '100%',
                }}
              >
                {isClearingData ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Limpando...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Limpar Dados
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Card para adicionar nova sessão
export const NewSessionCard: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: '12px',
        border: '2px dashed #25D366',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        minWidth: '220px',
        minHeight: '280px',
        cursor: 'pointer',
        transition: 'background 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f0fff4';
        e.currentTarget.style.borderColor = '#1fb855';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#fff';
        e.currentTarget.style.borderColor = '#25D366';
      }}
    >
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: '2px dashed #25D366',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={30} color="#25D366" />
      </div>
      <h3
        style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: '#25D366',
        }}
      >
        Nova Sessão
      </h3>
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          color: '#888',
        }}
      >
        Adicionar WhatsApp
      </p>
    </div>
  );
};

export default SessionCard;
