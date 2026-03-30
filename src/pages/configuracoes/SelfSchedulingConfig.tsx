import { useState, useEffect } from 'react';
import { useTenantContext } from '@/contexts/TenantContext';
import { useSelfSchedulingConfigMT } from '@/hooks/multitenant/useSelfSchedulingMT';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// =============================================================================
// DIAS DA SEMANA
// =============================================================================

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terca', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
  { value: 6, label: 'Sabado', short: 'Sab' },
];

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function SelfSchedulingConfig() {
  const { franchise, franchises } = useTenantContext();
  const effectiveFranchiseId = franchise?.id || franchises?.[0]?.id;

  const { config, isLoading, upsertConfig } = useSelfSchedulingConfigMT(effectiveFranchiseId);

  // Local form state
  const [isActive, setIsActive] = useState(false);
  const [duracaoPadrao, setDuracaoPadrao] = useState(60);
  const [horarioInicio, setHorarioInicio] = useState('08:00');
  const [horarioFim, setHorarioFim] = useState('20:00');
  const [intervaloMinutos, setIntervaloMinutos] = useState(30);
  const [diasAntecedenciaMin, setDiasAntecedenciaMin] = useState(1);
  const [diasAntecedenciaMax, setDiasAntecedenciaMax] = useState(30);
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [mensagemConfirmacao, setMensagemConfirmacao] = useState(
    'Agendamento confirmado! Entraremos em contato para confirmar.'
  );
  const [copied, setCopied] = useState(false);

  // Populate form when config loads
  useEffect(() => {
    if (config) {
      setIsActive(config.is_active);
      setDuracaoPadrao(config.duracao_padrao || 60);
      setHorarioInicio(config.horario_inicio || '08:00');
      setHorarioFim(config.horario_fim || '20:00');
      setIntervaloMinutos(config.intervalo_minutos || 30);
      setDiasAntecedenciaMin(config.dias_antecedencia_min || 1);
      setDiasAntecedenciaMax(config.dias_antecedencia_max || 30);
      setDiasSemana(config.dias_semana || [1, 2, 3, 4, 5, 6]);
      setMensagemConfirmacao(config.mensagem_confirmacao || '');
    }
  }, [config]);

  // Toggle day of week
  const toggleDay = (day: number) => {
    setDiasSemana(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  // Save
  const handleSave = () => {
    upsertConfig.mutate({
      is_active: isActive,
      duracao_padrao: duracaoPadrao,
      horario_inicio: horarioInicio,
      horario_fim: horarioFim,
      intervalo_minutos: intervaloMinutos,
      dias_antecedencia_min: diasAntecedenciaMin,
      dias_antecedencia_max: diasAntecedenciaMax,
      dias_semana: diasSemana,
      mensagem_confirmacao: mensagemConfirmacao,
    });
  };

  // Preview URL
  const franchiseSlug = franchise?.slug || franchise?.id || effectiveFranchiseId || '';
  const previewUrl = `${window.location.origin}/agendar/${franchiseSlug}`;

  // Copy URL
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(previewUrl).then(() => {
      setCopied(true);
      toast.success('URL copiada!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!effectiveFranchiseId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg text-muted-foreground">Selecione uma franquia para configurar o auto-agendamento.</p>
      </div>
    );
  }

  return (
      <div className="space-y-6 max-w-2xl mx-auto p-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Auto-Agendamento</h1>
          <p className="text-muted-foreground">
            Configure o agendamento online para seus clientes.
          </p>
        </div>

        {/* Status toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Auto-agendamento ativo</p>
                <p className="text-sm text-muted-foreground">
                  Permitir que clientes agendem online
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview URL */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Link publico</CardTitle>
            <CardDescription>Compartilhe este link para seus clientes agendarem online.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Input value={previewUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="sm" onClick={handleCopyUrl} className="gap-2 whitespace-nowrap">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open(previewUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Visualizar pagina
            </Button>
          </CardContent>
        </Card>

        {/* Horarios */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Horarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="horario-inicio">Horario de inicio</Label>
                <Input
                  id="horario-inicio"
                  type="time"
                  value={horarioInicio}
                  onChange={e => setHorarioInicio(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="horario-fim">Horario de termino</Label>
                <Input
                  id="horario-fim"
                  type="time"
                  value={horarioFim}
                  onChange={e => setHorarioFim(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duracao">Duracao padrao (min)</Label>
                <Input
                  id="duracao"
                  type="number"
                  value={duracaoPadrao}
                  onChange={e => setDuracaoPadrao(Number(e.target.value))}
                  min={15}
                  max={480}
                />
              </div>
              <div>
                <Label htmlFor="intervalo">Intervalo entre horarios (min)</Label>
                <Input
                  id="intervalo"
                  type="number"
                  value={intervaloMinutos}
                  onChange={e => setIntervaloMinutos(Number(e.target.value))}
                  min={10}
                  max={120}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dias da semana */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Dias disponiveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map(dia => (
                <Badge
                  key={dia.value}
                  variant={diasSemana.includes(dia.value) ? 'default' : 'outline'}
                  className="cursor-pointer px-4 py-2 text-sm"
                  onClick={() => toggleDay(dia.value)}
                >
                  {dia.short}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Antecedencia */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Antecedencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="antecedencia-min">Antecedencia minima (dias)</Label>
                <Input
                  id="antecedencia-min"
                  type="number"
                  value={diasAntecedenciaMin}
                  onChange={e => setDiasAntecedenciaMin(Number(e.target.value))}
                  min={0}
                  max={30}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: 1 = nao pode agendar para hoje
                </p>
              </div>
              <div>
                <Label htmlFor="antecedencia-max">Antecedencia maxima (dias)</Label>
                <Input
                  id="antecedencia-max"
                  type="number"
                  value={diasAntecedenciaMax}
                  onChange={e => setDiasAntecedenciaMax(Number(e.target.value))}
                  min={1}
                  max={365}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: 30 = pode agendar ate 30 dias a frente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mensagem de confirmacao */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Mensagem de confirmacao</CardTitle>
            <CardDescription>Exibida ao cliente apos o agendamento ser criado.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={mensagemConfirmacao}
              onChange={e => setMensagemConfirmacao(e.target.value)}
              rows={3}
              placeholder="Agendamento confirmado! Entraremos em contato para confirmar."
            />
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={upsertConfig.isPending}
            className="gap-2"
            size="lg"
          >
            {upsertConfig.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Configuracao
          </Button>
        </div>
      </div>
  );
}
