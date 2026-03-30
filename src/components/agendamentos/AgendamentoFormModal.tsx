import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CalendarIcon, Loader2, Search, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgendamentosAdapter } from "@/hooks/useAgendamentosAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useResponsibleUsersAdapter } from "@/hooks/useResponsibleUsersAdapter";
import { useLeadsAdapter } from "@/hooks/useLeadsAdapter";
import { useServicosAdapter } from "@/hooks/useServicosAdapter";
import { AgendamentoWithDetails, AGENDAMENTO_STATUS_OPTIONS, AGENDAMENTO_STATUS_CONFIG } from "@/types/agendamento";

// Helper para adicionar 30 minutos ao horário
const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, "0")}:${String(newMins).padStart(2, "0")}`;
};

const formSchema = z.object({
  nome_lead: z.string().min(1, "Nome é obrigatório"),
  telefone_lead: z.string().optional(),
  email_lead: z.string().email("Email inválido").optional().or(z.literal("")),
  data_agendamento: z.date({ required_error: "Data é obrigatória" }),
  hora_inicio: z.string().min(1, "Horário é obrigatório"),
  hora_fim: z.string().optional(),
  unidade_id: z.string().optional(),
  servicos: z.array(z.string()).default([]),
  status: z.string().default("agendado"),
  observacoes: z.string().optional(),
  responsavel_id: z.string().optional(),
  selected_lead_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AgendamentoFormModalProps {
  open: boolean;
  onClose: () => void;
  agendamento: AgendamentoWithDetails | null;
  selectedDate: Date;
}

export function AgendamentoFormModal({
  open,
  onClose,
  agendamento,
  selectedDate,
}: AgendamentoFormModalProps) {
  const { createAgendamento, updateAgendamento, isCreating, isUpdating } = useAgendamentosAdapter();
  const { franqueados } = useFranqueadosAdapter();
  const { users } = useResponsibleUsersAdapter();
  const { leads, updateStatus } = useLeadsAdapter();
  const { servicos, franchiseServices } = useServicosAdapter();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_lead: "",
      telefone_lead: "",
      email_lead: "",
      hora_inicio: "09:00",
      hora_fim: "09:30",
      servicos: [],
      status: "agendado",
      observacoes: "",
      selected_lead_id: "",
    },
  });

  // Serviços disponíveis para a unidade selecionada
  const unidadeId = form.watch("unidade_id");
  const servicosDisponiveis = useMemo(() => {
    if (!unidadeId) return servicos || [];
    const vinculos = (franchiseServices || []).filter(fs => fs.franchise_id === unidadeId);
    if (vinculos.length === 0) return servicos || [];
    return (servicos || []).filter(s => vinculos.some(v => v.service_id === s.id));
  }, [unidadeId, servicos, franchiseServices]);

  // Auto-preencher hora_fim quando hora_inicio muda
  const handleHoraInicioChange = useCallback((value: string) => {
    form.setValue("hora_inicio", value);
    if (value) {
      const horaFim = addMinutesToTime(value, 30);
      form.setValue("hora_fim", horaFim);
    }
  }, [form]);

  // Filtrar leads baseado no termo de busca
  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads.slice(0, 20);
    const term = searchTerm.toLowerCase();
    return leads
      .filter(
        (lead) =>
          lead.nome.toLowerCase().includes(term) ||
          lead.telefone.includes(term) ||
          lead.email?.toLowerCase().includes(term)
      )
      .slice(0, 20);
  }, [leads, searchTerm]);

  // Reset form when opening/closing
  useEffect(() => {
    if (open) {
      if (agendamento) {
        // Parse servicos from string (comma-separated) to array
        const servicosArray = agendamento.servico 
          ? agendamento.servico.split(",").map(s => s.trim()).filter(Boolean)
          : [];
        
        form.reset({
          nome_lead: agendamento.nome_lead || "",
          telefone_lead: agendamento.telefone_lead || "",
          email_lead: agendamento.email_lead || "",
          data_agendamento: new Date(agendamento.data_agendamento),
          hora_inicio: agendamento.hora_inicio.slice(0, 5),
          hora_fim: agendamento.hora_fim?.slice(0, 5) || addMinutesToTime(agendamento.hora_inicio.slice(0, 5), 30),
          unidade_id: agendamento.unidade_id || undefined,
          servicos: servicosArray,
          status: agendamento.status,
          observacoes: agendamento.observacoes || "",
          responsavel_id: agendamento.responsavel_id || undefined,
          selected_lead_id: "",
        });
      } else {
        form.reset({
          nome_lead: "",
          telefone_lead: "",
          email_lead: "",
          data_agendamento: selectedDate,
          hora_inicio: "09:00",
          hora_fim: "09:30",
          servicos: [],
          status: "agendado",
          observacoes: "",
          selected_lead_id: "",
        });
      }
      setSearchTerm("");
    }
  }, [open, agendamento, selectedDate, form]);

  // Handle lead selection
  const handleSelectLead = (leadId: string) => {
    const selectedLead = leads.find((l) => l.id === leadId);
    if (selectedLead) {
      form.setValue("nome_lead", selectedLead.nome);
      form.setValue("telefone_lead", selectedLead.telefone || "");
      form.setValue("email_lead", selectedLead.email || "");
      form.setValue("selected_lead_id", selectedLead.id);

      // Encontrar a unidade pelo franqueado_id ou pelo nome
      const franqueado = franqueados.find(
        (f) =>
          f.id === (selectedLead as any).franqueado_id ||
          f.nome_fantasia?.toLowerCase() === selectedLead.unidade?.toLowerCase()
      );

      if (franqueado) {
        form.setValue("unidade_id", franqueado.id);
      }
    }
    setSearchOpen(false);
    setSearchTerm("");
  };

  const onSubmit = async (data: FormData) => {
    // Join servicos array into comma-separated string
    const servicosString = data.servicos.length > 0 ? data.servicos.join(", ") : null;
    
    const payload = {
      nome_lead: data.nome_lead,
      telefone_lead: data.telefone_lead || null,
      email_lead: data.email_lead || null,
      data_agendamento: format(data.data_agendamento, "yyyy-MM-dd"),
      hora_inicio: data.hora_inicio,
      hora_fim: data.hora_fim || null,
      unidade_id: data.unidade_id || null,
      servico: servicosString,
      status: data.status as any,
      observacoes: data.observacoes || null,
      responsavel_id: data.responsavel_id || null,
      lead_id: data.selected_lead_id || agendamento?.lead_id || crypto.randomUUID(),
      lead_type: agendamento?.lead_type || "geral" as const,
    };

    if (agendamento) {
      updateAgendamento({ id: agendamento.id, ...payload });
    } else {
      createAgendamento(payload);

      // Atualizar status do lead para "Avaliação Agendada" se um lead foi selecionado
      if (data.selected_lead_id) {
        updateStatus({ id: data.selected_lead_id, status: "Avaliação Agendada" });
      }
    }

    onClose();
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {agendamento ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Lead Search - Only for new agendamentos */}
            {!agendamento && (
              <div className="space-y-2">
                <FormLabel>Buscar Lead Existente</FormLabel>
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={searchOpen}
                      className="w-full justify-start text-left font-normal"
                    >
                      <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                      {form.watch("selected_lead_id")
                        ? leads.find((l) => l.id === form.watch("selected_lead_id"))?.nome
                        : "Buscar por nome, telefone ou email..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Digite para buscar..."
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>Nenhum lead encontrado.</CommandEmpty>
                        <CommandGroup>
                          {filteredLeads.map((lead) => (
                            <CommandItem
                              key={lead.id}
                              value={lead.id}
                              onSelect={() => handleSelectLead(lead.id)}
                              className="flex items-center gap-3 cursor-pointer"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                <User className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{lead.nome}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {lead.email || lead.telefone}
                                </p>
                              </div>
                              {form.watch("selected_lead_id") === lead.id && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {form.watch("selected_lead_id") && (
                  <p className="text-xs text-muted-foreground">
                    Lead selecionado será atualizado para "Avaliação Agendada"
                  </p>
                )}
              </div>
            )}

            {/* Nome */}
            <FormField
              control={form.control}
              name="nome_lead"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Telefone e Email */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefone_lead"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email_lead"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Data e Horários */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="data_agendamento"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Selecione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={ptBR}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hora_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início *</FormLabel>
                    <FormControl>
                      <Input 
                        type="time" 
                        value={field.value}
                        onChange={(e) => handleHoraInicioChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hora_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl>
                      <Input type="time" value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Unidade */}
            <FormField
              control={form.control}
              name="unidade_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {franqueados.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome_fantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Serviços - Seleção Múltipla */}
            <FormField
              control={form.control}
              name="servicos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviços</FormLabel>
                  <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                    {servicosDisponiveis.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum serviço disponível</p>
                    ) : (
                      servicosDisponiveis.map((servico) => (
                        <div key={servico.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`servico-${servico.id}`}
                            checked={field.value?.includes(servico.nome)}
                            onCheckedChange={(checked) => {
                              const currentValue = field.value || [];
                              if (checked) {
                                field.onChange([...currentValue, servico.nome]);
                              } else {
                                field.onChange(currentValue.filter((s: string) => s !== servico.nome));
                              }
                            }}
                          />
                          <label
                            htmlFor={`servico-${servico.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {servico.nome}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  {field.value && field.value.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {field.value.length} serviço(s) selecionado(s)
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status e Responsável */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AGENDAMENTO_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {AGENDAMENTO_STATUS_CONFIG[status].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsavel_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações sobre o agendamento..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {agendamento ? "Salvar" : "Criar Agendamento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}