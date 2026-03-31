import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Palette,
  Type,
  Layout,
  Image,
  Sparkles,
  Square,
  Layers,
  Eye,
  LayoutGrid,
  Paintbrush,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FormularioLayoutTemplate, LAYOUT_TEMPLATE_LABELS, FormularioUpdate } from '@/types/formulario';

// Schema de validacao
const personalizacaoSchema = z.object({
  // Template
  layout_template: z.enum(['padrao', 'landing_page', 'minimalista', 'card']).optional(),

  // Cores principais
  cor_primaria: z.string().optional(),
  cor_secundaria: z.string().optional(),
  cor_texto: z.string().optional(),
  cor_fundo: z.string().optional(),
  cor_botao: z.string().optional(),
  cor_botao_texto: z.string().optional(),

  // Cores dos campos
  cor_campo_fundo: z.string().optional(),
  cor_campo_texto: z.string().optional(),
  cor_campo_borda: z.string().optional(),
  cor_campo_foco: z.string().optional(),
  cor_label: z.string().optional(),

  // Stepper
  cor_stepper_ativo: z.string().optional(),
  cor_stepper_inativo: z.string().optional(),
  cor_stepper_completo: z.string().optional(),

  // Gradientes
  gradiente_ativo: z.boolean().optional(),
  gradiente_inicio: z.string().optional(),
  gradiente_fim: z.string().optional(),

  // Tipografia
  font_family: z.string().optional(),
  font_size_base: z.enum(['sm', 'base', 'lg']).optional(),

  // Bordas e Sombras
  border_radius: z.enum(['none', 'sm', 'md', 'lg', 'xl', '2xl', 'full']).optional(),
  sombra: z.enum(['none', 'sm', 'md', 'lg', 'xl', '2xl']).optional(),

  // Imagens
  logo_url: z.string().optional(),
  logo_tamanho: z.enum(['sm', 'md', 'lg', 'xl']).optional(),
  background_image_url: z.string().optional(),
  background_overlay: z.boolean().optional(),
  background_overlay_cor: z.string().optional(),

  // Badge/Destaque
  badge_texto: z.string().optional(),
  badge_cor_fundo: z.string().optional(),
  badge_cor_texto: z.string().optional(),
  icone_header_url: z.string().optional(),

  // Animacoes
  animacoes_ativas: z.boolean().optional(),

  // Botoes
  botao_largura_total: z.boolean().optional(),
  texto_botao: z.string().optional(),

  // Stepper Visual
  stepper_mostrar_numeros: z.boolean().optional(),
  stepper_mostrar_titulos: z.boolean().optional(),

  // Card
  card_max_width: z.enum(['sm', 'md', 'lg', 'xl', '2xl', 'full']).optional(),
  card_fundo: z.string().optional(),

  // Footer
  mostrar_footer: z.boolean().optional(),
  texto_footer: z.string().optional(),
  cor_footer_fundo: z.string().optional(),
  cor_footer_texto: z.string().optional(),

  // Secoes extras
  mostrar_contadores: z.boolean().optional(),
  mostrar_depoimentos: z.boolean().optional(),
  mostrar_beneficios: z.boolean().optional(),

  // Textos
  titulo: z.string().optional(),
  subtitulo: z.string().optional(),
  mensagem_sucesso: z.string().optional(),
});

type PersonalizacaoFormData = z.infer<typeof personalizacaoSchema>;

interface FormularioPersonalizacaoEditorProps {
  formulario?: {
    layout_template?: string;
    cor_primaria?: string;
    cor_secundaria?: string;
    cor_texto?: string;
    cor_fundo?: string;
    cor_botao?: string;
    cor_botao_texto?: string;
    cor_campo_fundo?: string;
    cor_campo_texto?: string;
    cor_campo_borda?: string;
    cor_campo_foco?: string;
    cor_label?: string;
    cor_stepper_ativo?: string;
    cor_stepper_inativo?: string;
    cor_stepper_completo?: string;
    gradiente_ativo?: boolean;
    gradiente_inicio?: string;
    gradiente_fim?: string;
    font_family?: string;
    font_size_base?: string;
    border_radius?: string;
    sombra?: string;
    logo_url?: string;
    logo_tamanho?: string;
    background_image_url?: string;
    background_overlay?: boolean;
    background_overlay_cor?: string;
    badge_texto?: string;
    badge_cor_fundo?: string;
    badge_cor_texto?: string;
    icone_header_url?: string;
    animacoes_ativas?: boolean;
    botao_largura_total?: boolean;
    texto_botao?: string;
    stepper_mostrar_numeros?: boolean;
    stepper_mostrar_titulos?: boolean;
    card_max_width?: string;
    card_fundo?: string;
    mostrar_footer?: boolean;
    texto_footer?: string;
    cor_footer_fundo?: string;
    cor_footer_texto?: string;
    mostrar_contadores?: boolean;
    mostrar_depoimentos?: boolean;
    mostrar_beneficios?: boolean;
    titulo?: string;
    subtitulo?: string;
    mensagem_sucesso?: string;
  };
  onChange?: (data: Partial<FormularioUpdate>) => Promise<void>;
  saving?: boolean;
}

// Cores pre-definidas para selecao rapida
const PRESET_COLORS = [
  { name: 'Verde Viniun', primary: '#10b981', secondary: '#059669' },
  { name: 'Azul', primary: '#3B82F6', secondary: '#1E40AF' },
  { name: 'Roxo', primary: '#8B5CF6', secondary: '#5B21B6' },
  { name: 'Rosa', primary: '#EC4899', secondary: '#BE185D' },
  { name: 'Laranja', primary: '#F97316', secondary: '#C2410C' },
  { name: 'Vermelho', primary: '#EF4444', secondary: '#B91C1C' },
  { name: 'Teal', primary: '#14B8A6', secondary: '#0F766E' },
  { name: 'Amarelo', primary: '#EAB308', secondary: '#A16207' },
];

// Componente de selecao de cor
const ColorPicker = ({
  value,
  onChange,
  label,
  description,
}: {
  value?: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <div className="flex gap-2">
      <div
        className="w-10 h-10 rounded-lg border cursor-pointer overflow-hidden"
        style={{ backgroundColor: value || '#FFFFFF' }}
      >
        <input
          type="color"
          value={value || '#FFFFFF'}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full opacity-0 cursor-pointer"
        />
      </div>
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#3B82F6"
        className="flex-1"
      />
    </div>
    {description && (
      <p className="text-xs text-muted-foreground">{description}</p>
    )}
  </div>
);

export default function FormularioPersonalizacaoEditor({
  formulario,
  onChange,
  saving,
}: FormularioPersonalizacaoEditorProps) {
  const [activeTab, setActiveTab] = useState('template');

  const form = useForm<PersonalizacaoFormData>({
    resolver: zodResolver(personalizacaoSchema),
    defaultValues: {
      layout_template: (formulario?.layout_template as PersonalizacaoFormData['layout_template']) || 'padrao',
      cor_primaria: formulario?.cor_primaria || '#10b981',
      cor_secundaria: formulario?.cor_secundaria || '#059669',
      cor_texto: formulario?.cor_texto || '#1F2937',
      cor_fundo: formulario?.cor_fundo || '#F8FAFC',
      cor_botao: formulario?.cor_botao || '#10b981',
      cor_botao_texto: formulario?.cor_botao_texto || '#FFFFFF',
      cor_campo_fundo: formulario?.cor_campo_fundo || '#F1F5F9',
      cor_campo_texto: formulario?.cor_campo_texto || '#1F2937',
      cor_campo_borda: formulario?.cor_campo_borda || '#E2E8F0',
      cor_campo_foco: formulario?.cor_campo_foco || '#10b981',
      cor_label: formulario?.cor_label || '#374151',
      cor_stepper_ativo: formulario?.cor_stepper_ativo || '#10b981',
      cor_stepper_inativo: formulario?.cor_stepper_inativo || '#CBD5E1',
      cor_stepper_completo: formulario?.cor_stepper_completo || '#22C55E',
      gradiente_ativo: formulario?.gradiente_ativo ?? false,
      gradiente_inicio: formulario?.gradiente_inicio || '#10b981',
      gradiente_fim: formulario?.gradiente_fim || '#059669',
      font_family: formulario?.font_family || 'Inter',
      font_size_base: (formulario?.font_size_base as PersonalizacaoFormData['font_size_base']) || 'base',
      border_radius: (formulario?.border_radius as PersonalizacaoFormData['border_radius']) || 'lg',
      sombra: (formulario?.sombra as PersonalizacaoFormData['sombra']) || 'lg',
      logo_url: formulario?.logo_url || '',
      logo_tamanho: (formulario?.logo_tamanho as PersonalizacaoFormData['logo_tamanho']) || 'md',
      background_image_url: formulario?.background_image_url || '',
      background_overlay: formulario?.background_overlay ?? false,
      background_overlay_cor: formulario?.background_overlay_cor || 'rgba(0,0,0,0.5)',
      badge_texto: formulario?.badge_texto || '',
      badge_cor_fundo: formulario?.badge_cor_fundo || '#10b981',
      badge_cor_texto: formulario?.badge_cor_texto || '#FFFFFF',
      icone_header_url: formulario?.icone_header_url || '',
      animacoes_ativas: formulario?.animacoes_ativas ?? true,
      botao_largura_total: formulario?.botao_largura_total ?? false,
      texto_botao: formulario?.texto_botao || 'Enviar',
      stepper_mostrar_numeros: formulario?.stepper_mostrar_numeros ?? true,
      stepper_mostrar_titulos: formulario?.stepper_mostrar_titulos ?? true,
      card_max_width: (formulario?.card_max_width as PersonalizacaoFormData['card_max_width']) || 'lg',
      card_fundo: formulario?.card_fundo || '#FFFFFF',
      mostrar_footer: formulario?.mostrar_footer ?? false,
      texto_footer: formulario?.texto_footer || '',
      cor_footer_fundo: formulario?.cor_footer_fundo || '#F1F5F9',
      cor_footer_texto: formulario?.cor_footer_texto || '#6B7280',
      mostrar_contadores: formulario?.mostrar_contadores ?? false,
      mostrar_depoimentos: formulario?.mostrar_depoimentos ?? false,
      mostrar_beneficios: formulario?.mostrar_beneficios ?? false,
      titulo: formulario?.titulo || '',
      subtitulo: formulario?.subtitulo || '',
      mensagem_sucesso: formulario?.mensagem_sucesso || 'Obrigado! Entraremos em contato em breve.',
    },
  });

  const watchGradienteAtivo = form.watch('gradiente_ativo');
  const watchBackgroundImage = form.watch('background_image_url');
  const watchLayoutTemplate = form.watch('layout_template');
  const watchMostrarFooter = form.watch('mostrar_footer');
  const watchBackgroundOverlay = form.watch('background_overlay');

  const applyPresetColors = (preset: typeof PRESET_COLORS[0]) => {
    form.setValue('cor_primaria', preset.primary);
    form.setValue('cor_secundaria', preset.secondary);
    form.setValue('cor_botao', preset.primary);
    form.setValue('cor_campo_foco', preset.primary);
    form.setValue('cor_stepper_ativo', preset.primary);
    form.setValue('gradiente_inicio', preset.primary);
    form.setValue('gradiente_fim', preset.secondary);
    form.setValue('badge_cor_fundo', preset.primary);
  };

  const resetToDefaults = () => {
    form.reset();
  };

  const handleSubmit = async (data: PersonalizacaoFormData) => {
    if (onChange) {
      await onChange(data);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-5">
            <TabsTrigger value="template" className="gap-2">
              <Layout className="h-4 w-4" />
              <span className="hidden sm:inline">Template</span>
            </TabsTrigger>
            <TabsTrigger value="cores" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Cores</span>
            </TabsTrigger>
            <TabsTrigger value="tipografia" className="gap-2">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Tipografia</span>
            </TabsTrigger>
            <TabsTrigger value="imagens" className="gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Imagens</span>
            </TabsTrigger>
            <TabsTrigger value="extras" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Extras</span>
            </TabsTrigger>
          </TabsList>

          {/* Template */}
          <TabsContent value="template" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Escolha o Template</CardTitle>
                <CardDescription>
                  Selecione o layout base do seu formulario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="layout_template"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(Object.keys(LAYOUT_TEMPLATE_LABELS) as FormularioLayoutTemplate[]).map((template) => (
                          <div
                            key={template}
                            onClick={() => field.onChange(template)}
                            className={`
                              p-4 rounded-lg border-2 cursor-pointer transition-all
                              ${field.value === template
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'}
                            `}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`
                                w-10 h-10 rounded-lg flex items-center justify-center
                                ${field.value === template ? 'bg-primary text-white' : 'bg-muted'}
                              `}>
                                {template === 'padrao' && <Square className="h-5 w-5" />}
                                {template === 'landing_page' && <LayoutGrid className="h-5 w-5" />}
                                {template === 'minimalista' && <Layout className="h-5 w-5" />}
                                {template === 'card' && <Layers className="h-5 w-5" />}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold">{LAYOUT_TEMPLATE_LABELS[template].label}</p>
                                <p className="text-sm text-muted-foreground">
                                  {LAYOUT_TEMPLATE_LABELS[template].description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Textos do formulario */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Textos</h3>

                  <FormField
                    control={form.control}
                    name="titulo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Titulo Principal</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Agende sua avaliacao gratuita!" />
                        </FormControl>
                        <FormDescription>Titulo que aparece no topo do formulario</FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subtitulo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtitulo</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Breve descricao do formulario..." />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="texto_botao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto do Botao de Envio</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enviar" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mensagem_sucesso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem de Sucesso</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Obrigado! Entraremos em contato em breve." />
                        </FormControl>
                        <FormDescription>Exibida apos o envio do formulario</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cores */}
          <TabsContent value="cores" className="space-y-6">
            {/* Presets de cores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paintbrush className="h-5 w-5" />
                  Paletas Rapidas
                </CardTitle>
                <CardDescription>Clique para aplicar uma combinacao de cores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPresetColors(preset)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:border-primary transition-colors"
                    >
                      <div className="flex -space-x-1">
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white"
                          style={{ backgroundColor: preset.secondary }}
                        />
                      </div>
                      <span className="text-sm">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cores Principais */}
            <Card>
              <CardHeader>
                <CardTitle>Cores Principais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cor_primaria"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Cor Primaria"
                        description="Cor principal do tema"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_secundaria"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Cor Secundaria"
                        description="Cor de destaque"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_fundo"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Cor de Fundo"
                        description="Fundo da pagina"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_texto"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Cor do Texto"
                        description="Texto principal"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_botao"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Cor do Botao"
                        description="Fundo dos botoes"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_botao_texto"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Texto do Botao"
                        description="Cor do texto nos botoes"
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Gradiente */}
            <Card>
              <CardHeader>
                <CardTitle>Gradiente</CardTitle>
                <CardDescription>Aplicar gradiente no fundo do formulario</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="gradiente_ativo"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel>Ativar Gradiente</FormLabel>
                        <FormDescription>Aplica um gradiente suave no fundo</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {watchGradienteAtivo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gradiente_inicio"
                      render={({ field }) => (
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Cor Inicial"
                        />
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gradiente_fim"
                      render={({ field }) => (
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          label="Cor Final"
                        />
                      )}
                    />
                  </div>
                )}

                {/* Preview do gradiente */}
                {watchGradienteAtivo && (
                  <div
                    className="h-16 rounded-lg border"
                    style={{
                      background: `linear-gradient(to right, ${form.watch('gradiente_inicio')}, ${form.watch('gradiente_fim')})`
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Cores dos Campos */}
            <Card>
              <CardHeader>
                <CardTitle>Cores dos Campos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cor_campo_fundo"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Fundo dos Campos"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_campo_texto"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Texto dos Campos"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_campo_borda"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Borda dos Campos"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_campo_foco"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Borda em Foco"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_label"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Cor dos Labels"
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Cores do Stepper */}
            <Card>
              <CardHeader>
                <CardTitle>Cores do Stepper (Wizard)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="cor_stepper_ativo"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Etapa Ativa"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_stepper_inativo"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Etapa Inativa"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cor_stepper_completo"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Etapa Completa"
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tipografia e Layout */}
          <TabsContent value="tipografia" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tipografia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="font_family"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fonte</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="Roboto">Roboto</SelectItem>
                          <SelectItem value="Open Sans">Open Sans</SelectItem>
                          <SelectItem value="Poppins">Poppins</SelectItem>
                          <SelectItem value="Montserrat">Montserrat</SelectItem>
                          <SelectItem value="Lato">Lato</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="font_size_base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamanho da Fonte</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sm">Pequeno</SelectItem>
                          <SelectItem value="base">Normal</SelectItem>
                          <SelectItem value="lg">Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bordas e Sombras</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="border_radius"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arredondamento das Bordas</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem arredondamento</SelectItem>
                          <SelectItem value="sm">Pequeno</SelectItem>
                          <SelectItem value="md">Medio</SelectItem>
                          <SelectItem value="lg">Grande</SelectItem>
                          <SelectItem value="xl">Extra Grande</SelectItem>
                          <SelectItem value="2xl">Muito Grande</SelectItem>
                          <SelectItem value="full">Completamente Redondo</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sombra"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sombra do Card</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem sombra</SelectItem>
                          <SelectItem value="sm">Sutil</SelectItem>
                          <SelectItem value="md">Media</SelectItem>
                          <SelectItem value="lg">Grande</SelectItem>
                          <SelectItem value="xl">Extra Grande</SelectItem>
                          <SelectItem value="2xl">Muito Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="card_max_width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Largura Maxima do Card</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sm">Pequeno (384px)</SelectItem>
                          <SelectItem value="md">Medio (448px)</SelectItem>
                          <SelectItem value="lg">Grande (512px)</SelectItem>
                          <SelectItem value="xl">Extra Grande (576px)</SelectItem>
                          <SelectItem value="2xl">Muito Grande (672px)</SelectItem>
                          <SelectItem value="full">Largura Total</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Botoes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="botao_largura_total"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel>Botao de Largura Total</FormLabel>
                        <FormDescription>O botao ocupa toda a largura</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Imagens */}
          <TabsContent value="imagens" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Logo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://exemplo.com/logo.png" />
                      </FormControl>
                      <FormDescription>Sera exibido no topo do formulario</FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logo_tamanho"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamanho do Logo</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sm">Pequeno (48px)</SelectItem>
                          <SelectItem value="md">Medio (64px)</SelectItem>
                          <SelectItem value="lg">Grande (80px)</SelectItem>
                          <SelectItem value="xl">Extra Grande (96px)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Imagem de Fundo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="background_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da Imagem de Fundo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://exemplo.com/fundo.jpg" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {watchBackgroundImage && (
                  <>
                    <FormField
                      control={form.control}
                      name="background_overlay"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <FormLabel>Overlay Escuro</FormLabel>
                            <FormDescription>Adiciona uma camada escura sobre a imagem</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {watchBackgroundOverlay && (
                      <FormField
                        control={form.control}
                        name="background_overlay_cor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor do Overlay</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="rgba(0,0,0,0.5)" />
                            </FormControl>
                            <FormDescription>Use formato RGBA para transparencia</FormDescription>
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badge/Destaque</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="badge_texto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto do Badge</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Promocao, Novo, Exclusivo..." />
                      </FormControl>
                      <FormDescription>Aparece como destaque no topo</FormDescription>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="badge_cor_fundo"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Fundo do Badge"
                      />
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="badge_cor_texto"
                    render={({ field }) => (
                      <ColorPicker
                        value={field.value}
                        onChange={field.onChange}
                        label="Texto do Badge"
                      />
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="icone_header_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Icone do Header</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://exemplo.com/icone.png" />
                      </FormControl>
                      <FormDescription>Icone que aparece ao lado do titulo</FormDescription>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Extras */}
          <TabsContent value="extras" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Animacoes</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="animacoes_ativas"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel>Habilitar Animacoes</FormLabel>
                        <FormDescription>Animacoes suaves ao carregar e transicionar</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stepper (para Wizard)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="stepper_mostrar_numeros"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel>Mostrar Numeros</FormLabel>
                        <FormDescription>Exibe numero da etapa no stepper</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stepper_mostrar_titulos"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel>Mostrar Titulos</FormLabel>
                        <FormDescription>Exibe titulo de cada etapa</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Footer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="mostrar_footer"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel>Mostrar Footer</FormLabel>
                        <FormDescription>Exibe rodape no formulario</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {watchMostrarFooter && (
                  <>
                    <FormField
                      control={form.control}
                      name="texto_footer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Texto do Footer</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nome da empresa ou mensagem" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="cor_footer_fundo"
                        render={({ field }) => (
                          <ColorPicker
                            value={field.value}
                            onChange={field.onChange}
                            label="Fundo do Footer"
                          />
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cor_footer_texto"
                        render={({ field }) => (
                          <ColorPicker
                            value={field.value}
                            onChange={field.onChange}
                            label="Texto do Footer"
                          />
                        )}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Secoes extras para Landing Page */}
            {watchLayoutTemplate === 'landing_page' && (
              <Card>
                <CardHeader>
                  <CardTitle>Secoes Extras (Landing Page)</CardTitle>
                  <CardDescription>Secoes adicionais para o template Landing Page</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="mostrar_contadores"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>Mostrar Contadores</FormLabel>
                          <FormDescription>Ex: "+100.000 pacientes", "5 estrelas"</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mostrar_depoimentos"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>Mostrar Depoimentos</FormLabel>
                          <FormDescription>Secao com depoimentos de clientes</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mostrar_beneficios"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>Mostrar Beneficios</FormLabel>
                          <FormDescription>Lista de beneficios/diferenciais</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Botoes de acao */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={resetToDefaults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar Padroes
            </Button>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Personalizacao'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
