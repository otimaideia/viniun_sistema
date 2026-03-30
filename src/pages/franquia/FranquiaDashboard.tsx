import { Link } from "react-router-dom";
import { useUserProfileAdapter } from "@/hooks/useUserProfileAdapter";
import { useFranqueadosAdapter } from "@/hooks/useFranqueadosAdapter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  MessageSquare,
  FileText,
  Target,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  Phone
} from "lucide-react";
import { format, startOfDay, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

const FranquiaDashboard = () => {
  const { profile } = useUserProfileAdapter();
  const { franqueados } = useFranqueadosAdapter();

  const franqueado = franqueados.find((f) => f.id === profile?.franqueado_id);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["franquia-dashboard-stats", profile?.franchise_id],
    queryFn: async () => {
      if (!profile?.franchise_id) return null;

      const hoje = startOfDay(new Date());
      const inicioSemana = startOfWeek(new Date(), { weekStartsOn: 1 });
      const fimSemana = endOfWeek(new Date(), { weekStartsOn: 1 });

      // Leads de hoje
      const { count: leadsHoje } = await supabase
        .from("mt_leads")
        .select("*", { count: "exact", head: true })
        .eq("franchise_id", profile.franchise_id)
        .gte("created_at", hoje.toISOString());

      // Leads da semana
      const { count: leadsSemana } = await supabase
        .from("mt_leads")
        .select("*", { count: "exact", head: true })
        .eq("franchise_id", profile.franchise_id)
        .gte("created_at", inicioSemana.toISOString())
        .lte("created_at", fimSemana.toISOString());

      // Leads em contato
      const { count: leadsEmContato } = await supabase
        .from("mt_leads")
        .select("*", { count: "exact", head: true })
        .eq("franchise_id", profile.franchise_id)
        .eq("status", "em_contato");

      // Leads convertidos
      const { count: leadsConvertidos } = await supabase
        .from("mt_leads")
        .select("*", { count: "exact", head: true })
        .eq("franchise_id", profile.franchise_id)
        .in("status", ["convertido", "ganho"]);

      // Últimos 5 leads
      const { data: recentLeads } = await supabase
        .from("mt_leads")
        .select("id, nome, telefone, created_at, status")
        .eq("franchise_id", profile.franchise_id)
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        leadsHoje: leadsHoje || 0,
        leadsSemana: leadsSemana || 0,
        leadsEmContato: leadsEmContato || 0,
        leadsConvertidos: leadsConvertidos || 0,
        recentLeads: recentLeads || [],
      };
    },
    enabled: !!profile?.franchise_id,
  });

  const quickActions = [
    { label: "Ver Leads", href: "/franquia/leads", icon: Users },
    { label: "WhatsApp", href: "/whatsapp", icon: MessageSquare },
    { label: "Formulários", href: "/franquia/formularios", icon: FileText },
    { label: "Metas", href: "/franquia/metas", icon: Target },
  ];

  if (!profile?.franchise_id) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Você não está vinculado a nenhuma franquia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Olá, {profile?.nome || profile?.full_name || "Usuário"}! 👋
          </h1>
          <p className="text-muted-foreground">
            {franqueado?.nome_fantasia} - {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
            Unidade Ativa
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">{stats?.leadsHoje}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Esta Semana</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <span className="text-2xl font-bold">{stats?.leadsSemana}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Contato</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-amber-600" />
                <span className="text-2xl font-bold">{stats?.leadsEmContato}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Convertidos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">{stats?.leadsConvertidos}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.href} to={action.href}>
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                  <action.icon className="h-6 w-6" />
                  <span>{action.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Leads Recentes</CardTitle>
            <CardDescription>Últimos leads cadastrados</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/franquia/leads">
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : stats?.recentLeads.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum lead cadastrado ainda
            </p>
          ) : (
            <div className="space-y-3">
              {stats?.recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  to={`/leads/${lead.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{lead.nome}</p>
                      <p className="text-sm text-muted-foreground">{lead.telefone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {lead.status || "novo"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(lead.created_at), "dd/MM HH:mm")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FranquiaDashboard;
