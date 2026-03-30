import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfluenciadoraAuthContext } from '@/contexts/InfluenciadoraAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/types/influenciadora';
import { ContratoTemplate, type ContratoData } from '@/components/influenciadoras/ContratoTemplate';
import {
  CheckCircle2,
  FileText,
  Tag,
  Sparkles,
  ChevronRight,
  Loader2,
  Trash2,
  Pen,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

type Step = 'contrato' | 'assinar' | 'codigo' | 'pronto';

const TIPO_LABELS: Record<string, string> = {
  mensal: 'Pagamento Mensal',
  por_post: 'Por Post',
  comissao: 'Comissão por Indicação',
  permuta: 'Permuta (Procedimentos)',
  misto: 'Modelo Misto',
};

const STEPS = [
  { id: 'contrato', label: 'Contrato', icon: FileText },
  { id: 'assinar', label: 'Assinar', icon: Pen },
  { id: 'codigo', label: 'Meu Código', icon: Tag },
  { id: 'pronto', label: 'Pronto!', icon: Sparkles },
];

export default function OnboardingInfluenciadora() {
  const { influenciadora, refreshInfluenciadora } = useInfluenciadoraAuthContext();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('contrato');
  const [selectedContratoId, setSelectedContratoId] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [codigoOk, setCodigoOk] = useState<boolean | null>(null);
  const [isCheckingCodigo, setIsCheckingCodigo] = useState(false);
  const [isSavingCodigo, setIsSavingCodigo] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const checkCodigoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buscar contratos da influenciadora via RPC (bypassa RLS para anon)
  const { data: contratos = [], isLoading: isLoadingContratos } = useQuery({
    queryKey: ['onboarding-contratos', influenciadora?.id],
    queryFn: async () => {
      if (!influenciadora?.id) return [];
      const { data, error } = await supabase
        .rpc('get_influencer_contracts', { p_influencer_id: influenciadora.id });
      if (error) throw error;
      return data || [];
    },
    enabled: !!influenciadora?.id,
  });

  // Pré-selecionar se houver apenas 1 contrato
  useEffect(() => {
    if (contratos.length === 1 && !selectedContratoId) {
      setSelectedContratoId(contratos[0].id);
    }
  }, [contratos, selectedContratoId]);

  // Validação de unicidade do código (definida ANTES do useEffect que a usa)
  const checkCodigo = useCallback(
    async (value: string) => {
      if (!value || value.length < 3) { setCodigoOk(null); return; }
      if (value === influenciadora?.codigo_indicacao) { setCodigoOk(true); return; }
      setIsCheckingCodigo(true);
      const { data } = await supabase
        .from('mt_influencers')
        .select('id')
        .eq('codigo', value)
        .eq('tenant_id', influenciadora?.tenant_id || '')
        .neq('id', influenciadora?.id || '')
        .maybeSingle();
      setCodigoOk(!data);
      setIsCheckingCodigo(false);
    },
    [influenciadora]
  );

  // Pré-preencher código com o existente
  useEffect(() => {
    if (influenciadora?.codigo_indicacao) {
      setCodigo(influenciadora.codigo_indicacao);
      setCodigoOk(true); // código existente já é válido
    } else if (influenciadora?.nome) {
      const first = influenciadora.nome.trim().split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
      setCodigo(first);
      setTimeout(() => checkCodigo(first), 100);
    }
  }, [influenciadora, checkCodigo]);

  const handleCodigoChange = (value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    setCodigo(clean);
    setCodigoOk(null);
    if (checkCodigoTimeout.current) clearTimeout(checkCodigoTimeout.current);
    checkCodigoTimeout.current = setTimeout(() => checkCodigo(clean), 500);
  };

  // ============================================================
  // Canvas de assinatura
  // ============================================================
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // ============================================================
  // Ações
  // ============================================================
  const handleAssinar = async () => {
    if (!selectedContratoId || !hasSignature || !canvasRef.current) return;
    setIsSigning(true);
    try {
      const assinaturaImagem = canvasRef.current.toDataURL('image/png');
      const { error } = await supabase
        .rpc('sign_influencer_contract', {
          p_contract_id: selectedContratoId,
          p_assinatura_imagem: assinaturaImagem,
          p_user_agent: navigator.userAgent.slice(0, 200),
        });

      if (error) throw error;
      toast.success('Contrato assinado com sucesso!');
      setStep('codigo');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao assinar contrato');
    } finally {
      setIsSigning(false);
    }
  };

  const handleSalvarCodigo = async () => {
    if (!codigo || !codigoOk || !influenciadora?.id) return;
    setIsSavingCodigo(true);
    try {
      const { error } = await supabase
        .rpc('save_influencer_codigo', {
          p_id: influenciadora.id,
          p_codigo: codigo,
        });

      if (error) throw error;
      toast.success('Código salvo!');
      setStep('pronto');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar código');
    } finally {
      setIsSavingCodigo(false);
    }
  };

  const handleFinalizar = async () => {
    if (!influenciadora?.id) return;
    setIsFinishing(true);
    try {
      const { error } = await supabase
        .rpc('complete_influencer_onboarding', { p_id: influenciadora.id });

      if (error) throw error;
      await refreshInfluenciadora();
      navigate('/influenciadores/painel');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao finalizar onboarding');
    } finally {
      setIsFinishing(false);
    }
  };

  const linkIndicacao = `${window.location.origin}/influenciadores?ref=${codigo}`;

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(linkIndicacao);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
    toast.success('Link copiado!');
  };

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const contratoSelecionado = contratos.find((c) => c.id === selectedContratoId);

  // Buscar dados da franquia do contrato selecionado (para preencher CNPJ, cidade, responsável)
  const { data: franquiaInfo } = useQuery({
    queryKey: ['onboarding-franquia', contratoSelecionado?.franchise_id],
    queryFn: async () => {
      if (!contratoSelecionado?.franchise_id) return null;
      const { data, error } = await supabase
        .rpc('get_franchise_info', { p_franchise_id: contratoSelecionado.franchise_id });
      if (error) throw error;
      return data as {
        id: string;
        nome_fantasia: string;
        cnpj: string | null;
        cidade: string | null;
        estado: string | null;
        endereco: string | null;
        numero: string | null;
        bairro: string | null;
        cep: string | null;
        responsavel_nome: string | null;
      } | null;
    },
    enabled: !!contratoSelecionado?.franchise_id && step === 'assinar',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#662E8E]/5 via-white to-[#F2B705]/5 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#662E8E] to-[#F2B705] flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="font-bold text-xl text-[#662E8E]">YESlaser</p>
          <p className="text-xs text-gray-500">Portal do Influenciador(a)</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8 flex-wrap justify-center">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = s.id === step;
          const isDone = i < stepIndex;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#662E8E] text-white shadow-md'
                  : isDone
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className={`h-4 w-4 ${isDone ? 'text-green-400' : 'text-gray-300'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-2xl">

        {/* ======================================================== */}
        {/* STEP 1: SELECIONAR CONTRATO */}
        {/* ======================================================== */}
        {step === 'contrato' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#662E8E]" />
                Seu Contrato
              </CardTitle>
              <CardDescription>
                Selecione o contrato que você irá assinar digitalmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingContratos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#662E8E]" />
                </div>
              ) : contratos.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
                  <p className="font-medium text-gray-800">Nenhum contrato disponível</p>
                  <p className="text-sm text-muted-foreground">
                    Nossa equipe irá preparar seu contrato em breve. Você pode continuar e voltar depois.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setStep('codigo')}
                    className="mt-4"
                  >
                    Continuar sem contrato
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {contratos.map((contrato) => (
                      <button
                        key={contrato.id}
                        onClick={() => setSelectedContratoId(contrato.id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          selectedContratoId === contrato.id
                            ? 'border-[#662E8E] bg-[#662E8E]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{TIPO_LABELS[contrato.tipo] || contrato.tipo}</p>
                            <p className="text-sm text-muted-foreground">
                              {contrato.data_inicio
                                ? format(new Date(contrato.data_inicio), 'dd/MM/yyyy', { locale: ptBR })
                                : '—'}
                              {' → '}
                              {contrato.data_fim
                                ? format(new Date(contrato.data_fim), 'dd/MM/yyyy', { locale: ptBR })
                                : 'Indeterminado'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={contrato.status === 'ativo' ? 'text-green-700 border-green-200' : 'text-gray-500'}
                            >
                              {contrato.status}
                            </Badge>
                            {selectedContratoId === contrato.id && (
                              <CheckCircle2 className="h-5 w-5 text-[#662E8E]" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <Button
                    className="w-full bg-[#662E8E] hover:bg-[#662E8E]/90"
                    disabled={!selectedContratoId}
                    onClick={() => setStep('assinar')}
                  >
                    Visualizar e Assinar
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ======================================================== */}
        {/* STEP 2: LER E ASSINAR */}
        {/* ======================================================== */}
        {step === 'assinar' && contratoSelecionado && (() => {
          // Endereço da franquia formatado
          const franquiaEndereco = franquiaInfo?.endereco
            ? [franquiaInfo.endereco, franquiaInfo.numero ? `nº ${franquiaInfo.numero}` : null, franquiaInfo.bairro]
                .filter(Boolean).join(', ')
            : undefined;

          const contratoData: ContratoData = {
            template_tipo: (contratoSelecionado.template_tipo as any) ?? (contratoSelecionado.tipo === 'permuta' ? 'contrato_permuta' : 'contrato_normal'),
            influenciadora_nome: influenciadora?.nome_completo || influenciadora?.nome || '',
            influenciadora_cpf: influenciadora?.cpf || undefined,
            influenciadora_rg: influenciadora?.rg || undefined,
            influenciadora_email: influenciadora?.email ?? undefined,
            influenciadora_telefone: influenciadora?.whatsapp ?? influenciadora?.telefone ?? undefined,
            influenciadora_rua: influenciadora?.endereco || undefined,
            influenciadora_numero: influenciadora?.numero || undefined,
            influenciadora_bairro: influenciadora?.bairro || undefined,
            influenciadora_cep: influenciadora?.cep || undefined,
            influenciadora_cidade: influenciadora?.cidade || undefined,
            influenciadora_estado: influenciadora?.estado || undefined,
            contrato_numero: `YLS-INF-${contratoSelecionado.id.substring(0, 8).toUpperCase()}`,
            contrato_tipo: contratoSelecionado.tipo,
            data_inicio: contratoSelecionado.data_inicio,
            data_fim: contratoSelecionado.data_fim,
            valor_mensal: contratoSelecionado.valor_mensal,
            valor_por_post: contratoSelecionado.valor_por_post,
            percentual_comissao: contratoSelecionado.percentual_comissao,
            valor_comissao_fixa: contratoSelecionado.valor_comissao_fixa,
            credito_permuta: contratoSelecionado.credito_permuta,
            posts_mes: contratoSelecionado.posts_mes,
            stories_mes: contratoSelecionado.stories_mes,
            reels_mes: contratoSelecionado.reels_mes,
            servicos_permuta: contratoSelecionado.servicos_permuta ?? [],
            // Dados da empresa (franquia tem precedência sobre tenant genérico)
            empresa_nome: franquiaInfo?.nome_fantasia ?? 'YESlaser',
            empresa_cnpj: franquiaInfo?.cnpj ?? undefined,
            empresa_cidade: franquiaInfo?.cidade ?? undefined,
            empresa_estado: franquiaInfo?.estado ?? undefined,
            empresa_endereco: franquiaInfo?.endereco ? franquiaEndereco : undefined,
            empresa_representante: franquiaInfo?.responsavel_nome?.trim() || undefined,
            // Franquia (para garantir prioridade no template)
            franquia_nome: franquiaInfo?.nome_fantasia ?? undefined,
            franquia_cnpj: franquiaInfo?.cnpj ?? undefined,
            franquia_cidade: franquiaInfo?.cidade ?? undefined,
            franquia_estado: franquiaInfo?.estado ?? undefined,
            franquia_endereco: franquiaEndereco,
            franquia_cep: franquiaInfo?.cep ?? undefined,
          };
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pen className="h-5 w-5 text-[#662E8E]" />
                  Leia e Assine o Contrato
                </CardTitle>
                <CardDescription>
                  Leia o contrato completo abaixo e assine com o dedo ou mouse
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Contrato completo em container scrollável */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Contrato de Parceria
                    </span>
                    <span className="text-xs text-gray-400">Role para ler o contrato completo ↓</span>
                  </div>
                  <div className="overflow-y-auto max-h-[420px] bg-white">
                    {/* Texto personalizado (se existir) */}
                    {(contratoSelecionado as any).texto_contrato ? (
                      <div className="p-6 prose prose-sm max-w-none whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                        {(contratoSelecionado as any).texto_contrato}
                      </div>
                    ) : (
                      <ContratoTemplate data={contratoData} hideButtons />
                    )}
                  </div>
                </div>

                {/* Disclaimer legal */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                  <strong>Declaração:</strong> Ao assinar abaixo, declaro que li e concordo com todas as
                  condições deste contrato de influenciadora com a YESlaser. Esta assinatura digital tem
                  validade legal conforme a Lei 14.063/2020 (assinaturas eletrônicas no Brasil).
                </div>

                {/* Canvas de assinatura */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Pen className="h-3.5 w-3.5" />
                    Assine aqui (dedo ou mouse)
                  </Label>
                  <div className="relative rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-white touch-none select-none">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={160}
                      className="w-full cursor-crosshair"
                      style={{ touchAction: 'none' }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    {!hasSignature && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-gray-300 text-sm">Assine aqui ✍️</p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={clearSignature}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Limpar
                    </button>
                    <p className="text-xs text-gray-400">
                      {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('contrato')}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    className="flex-1 bg-[#662E8E] hover:bg-[#662E8E]/90"
                    disabled={!hasSignature || isSigning}
                    onClick={handleAssinar}
                  >
                    {isSigning ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Assinar Contrato
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* ======================================================== */}
        {/* STEP 3: CÓDIGO DE INDICAÇÃO */}
        {/* ======================================================== */}
        {step === 'codigo' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-[#662E8E]" />
                Seu Código de Indicação
              </CardTitle>
              <CardDescription>
                Este código é único e exclusivo seu — use-o para rastrear suas indicações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="codigo">
                  Escolha seu código exclusivo
                </Label>
                <div className="relative">
                  <Input
                    id="codigo"
                    value={codigo}
                    onChange={(e) => handleCodigoChange(e.target.value)}
                    placeholder="Ex: MARIA, JOAO123, INFLUENCER"
                    maxLength={20}
                    className={`pr-10 text-lg font-mono tracking-wider ${
                      codigoOk === true
                        ? 'border-green-500 focus-visible:ring-green-500'
                        : codigoOk === false
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : ''
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingCodigo ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : codigoOk === true ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : codigoOk === false ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
                {codigoOk === false && (
                  <p className="text-xs text-red-500">
                    Este código já está em uso. Tente outro.
                  </p>
                )}
                {codigoOk === true && (
                  <p className="text-xs text-green-600">
                    Código disponível! ✓
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Apenas letras maiúsculas e números, sem espaços. Máximo 20 caracteres.
                </p>
              </div>

              {/* Preview do link */}
              {codigo && codigoOk && (
                <div className="bg-gray-50 rounded-lg p-4 border space-y-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Seu link de indicação:</p>
                  <p className="text-sm font-mono text-[#662E8E] break-all">
                    {window.location.origin}/influenciadores?ref={codigo}
                  </p>
                  <p className="text-xs text-gray-500">
                    Compartilhe este link e ganhe por cada pessoa que se cadastrar!
                  </p>
                </div>
              )}

              <Button
                className="w-full bg-[#662E8E] hover:bg-[#662E8E]/90"
                disabled={!codigo || !codigoOk || isSavingCodigo}
                onClick={handleSalvarCodigo}
              >
                {isSavingCodigo ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Tag className="h-4 w-4 mr-2" />
                )}
                Confirmar Código
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ======================================================== */}
        {/* STEP 4: TUDO PRONTO! */}
        {/* ======================================================== */}
        {step === 'pronto' && (
          <Card className="border-2 border-[#662E8E]/30">
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-6">
              {/* Animação de sucesso */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#662E8E] to-[#F2B705] flex items-center justify-center animate-pulse">
                  <Sparkles className="h-12 w-12 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  Tudo pronto, {influenciadora?.nome?.split(' ')[0]}! 🎉
                </h2>
                <p className="text-muted-foreground max-w-sm">
                  Seu cadastro como influenciadora YESlaser está completo. Você já pode começar a compartilhar seu link!
                </p>
              </div>

              {/* Link de indicação */}
              <div className="w-full bg-gradient-to-r from-[#662E8E]/5 to-[#F2B705]/5 rounded-xl p-4 border border-[#662E8E]/20 space-y-3">
                <p className="text-sm font-semibold text-[#662E8E]">🔗 Seu link de indicação exclusivo</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white rounded px-3 py-2 border font-mono text-gray-700 break-all text-left">
                    {linkIndicacao}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopiarLink}
                    className="shrink-0"
                  >
                    {linkCopiado ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Código: <strong className="text-[#662E8E] font-mono">{codigo}</strong>
                </p>
              </div>

              <Button
                size="lg"
                className="w-full bg-[#662E8E] hover:bg-[#662E8E]/90"
                onClick={handleFinalizar}
                disabled={isFinishing}
              >
                {isFinishing ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-5 w-5 mr-2" />
                )}
                Acessar meu Portal
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
