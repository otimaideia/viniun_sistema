import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TotemLayout,
  TotemHeader,
  TotemInput,
  TotemAgendamentoCard,
  TotemCheckinSuccess,
  TotemError,
} from '@/components/totem';
import { useTotemCheckinAdapter } from '@/hooks/useTotemCheckinAdapter';
import useTenantDetection from '@/hooks/multitenant/useTenantDetection';
import { extractLocationHint, matchFranchiseByLocation } from '@/utils/franchiseLocation';
import { supabase } from '@/integrations/supabase/client';
import { TotemAgendamento } from '@/types/checkin';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TotemStep = 'input' | 'agendamentos' | 'success' | 'error';

export default function Totem() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenantDetection();

  const {
    unidade,
    agendamentos,
    isLoading,
    isLoadingUnidade,
    isCheckinLoading,
    error,
    getUnidadeBySlug,
    buscarAgendamentos,
    registrarCheckin,
    clearError,
    clearAgendamentos,
  } = useTotemCheckinAdapter();

  const [step, setStep] = useState<TotemStep>('input');
  const [selectedAgendamento, setSelectedAgendamento] = useState<TotemAgendamento | null>(null);
  const [checkinMetodo, setCheckinMetodo] = useState<'cpf' | 'telefone'>('cpf');
  const [domainLoading, setDomainLoading] = useState(!slug);

  // Carregar unidade ao montar
  useEffect(() => {
    if (slug) {
      // Com slug na URL: busca direto pelo slug
      getUnidadeBySlug(slug);
      return;
    }

    // Sem slug: detectar franquia pelo domínio (como /loja, /parceiro/cadastro, etc.)
    if (!tenant?.id) return;

    const loadByDomain = async () => {
      setDomainLoading(true);
      try {
        const { data: franchises } = await supabase
          .from('mt_franchises')
          .select('id, slug, nome_fantasia, cidade, estado, endereco, tenant_id')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .not('endereco', 'is', null)
          .order('nome');

        if (franchises?.length) {
          const locationHint = extractLocationHint(window.location.hostname, tenant.slug);
          const matched = matchFranchiseByLocation(franchises, locationHint);
          if (matched?.slug) {
            await getUnidadeBySlug(matched.slug);
          }
        }
      } finally {
        setDomainLoading(false);
      }
    };

    loadByDomain();
  }, [slug, tenant?.id, tenant?.slug, getUnidadeBySlug]);

  // Buscar agendamentos
  const handleSearch = useCallback(async (value: string, type: 'cpf' | 'telefone') => {
    if (!unidade) return;

    setCheckinMetodo(type);
    const result = await buscarAgendamentos(value, unidade.id, type);

    if (result.length > 0) {
      setStep('agendamentos');
    } else if (error) {
      setStep('error');
    }
  }, [unidade, buscarAgendamentos, error]);

  // Realizar check-in
  const handleCheckin = useCallback(async (agendamento: TotemAgendamento) => {
    const success = await registrarCheckin(
      agendamento.id,
      agendamento.lead_id,
      agendamento.franchise_id,   // MT: franchise_id (era unidade_id)
      checkinMetodo
    );

    if (success) {
      setSelectedAgendamento(agendamento);
      setStep('success');
    }
  }, [registrarCheckin, checkinMetodo]);

  // Resetar para tela inicial
  const handleReset = useCallback(() => {
    setStep('input');
    setSelectedAgendamento(null);
    clearError();
    clearAgendamentos();
  }, [clearError, clearAgendamentos]);

  // Voltar para busca
  const handleBack = useCallback(() => {
    setStep('input');
    clearError();
    clearAgendamentos();
  }, [clearError, clearAgendamentos]);

  // Loading da unidade
  if (isLoadingUnidade || domainLoading) {
    return (
      <TotemLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-white mb-4" />
          <p className="text-white text-lg">Carregando...</p>
        </div>
      </TotemLayout>
    );
  }

  // Unidade não encontrada
  if (!unidade && !isLoadingUnidade) {
    return (
      <TotemLayout>
        <TotemError
          message="Unidade não encontrada. Verifique o endereço ou entre em contato com a administração."
          onRetry={() => navigate('/')}
        />
      </TotemLayout>
    );
  }

  return (
    <TotemLayout>
      {/* Header da unidade */}
      <TotemHeader
        nomeUnidade={unidade?.nome_fantasia || ''}
        cidade={unidade?.cidade}
        estado={unidade?.estado}
      />

      {/* Conteúdo baseado no step */}
      {step === 'input' && (
        <TotemInput
          onSearch={handleSearch}
          isLoading={isLoading}
          error={error}
        />
      )}

      {step === 'agendamentos' && (
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          {agendamentos.map((ag) => (
            <TotemAgendamentoCard
              key={ag.id}
              agendamento={ag}
              onCheckin={() => handleCheckin(ag)}
              isLoading={isCheckinLoading}
            />
          ))}

          {agendamentos.length === 0 && (
            <TotemError
              message="Nenhum agendamento encontrado para hoje."
              onRetry={handleBack}
            />
          )}
        </div>
      )}

      {step === 'success' && selectedAgendamento && (
        <TotemCheckinSuccess
          nomeCliente={selectedAgendamento.lead_nome}
          onReset={handleReset}
          autoResetSeconds={10}
        />
      )}

      {step === 'error' && (
        <TotemError
          message={error || 'Ocorreu um erro. Tente novamente.'}
          onRetry={handleReset}
        />
      )}
    </TotemLayout>
  );
}
