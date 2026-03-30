// Pagina: Listagem de Grupos WhatsApp Multi-Tenant

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, UsersRound, Search, RefreshCw, AlertCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWhatsAppSessionsMT } from '@/hooks/multitenant/useWhatsAppSessionsMT';
import { useGroupsMT } from '@/hooks/multitenant/useGroupsMT';
import { useTenantContext } from '@/contexts/TenantContext';

export default function WhatsAppGrupos() {
  const navigate = useNavigate();
  const { accessLevel } = useTenantContext();

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { sessions, isLoading: isLoadingSessions } = useWhatsAppSessionsMT({ is_active: true });

  // Encontrar sessao selecionada para pegar session_name
  const selectedSession = sessions?.find((s) => s.id === selectedSessionId);
  const sessionName = selectedSession?.session_name;

  const { groups, isLoading: isLoadingGroups, refetch, error } = useGroupsMT(
    sessionName,
    selectedSessionId || undefined
  );

  // Filtrar grupos por busca
  const filteredGroups = groups.filter((g) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      g.subject?.toLowerCase().includes(term) ||
      g.id?.toLowerCase().includes(term)
    );
  });

  // Ao selecionar sessao
  const handleSessionChange = (value: string) => {
    setSelectedSessionId(value === 'none' ? '' : value);
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Grupos WhatsApp</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie grupos e adicione membros em massa
          </p>
        </div>
        <Button asChild>
          <Link to="/whatsapp/grupos/adicionar">
            <UsersRound className="h-4 w-4 mr-2" />
            Adicionar em Massa
          </Link>
        </Button>
      </div>

      {/* Seletor de sessao */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Sessao WhatsApp</label>
              <Select value={selectedSessionId || 'none'} onValueChange={handleSessionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma sessao..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione uma sessao...</SelectItem>
                  {sessions?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome || s.session_name}
                      {s.display_name ? ` (${s.display_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSessionId && (
              <>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1.5 block">Buscar grupo</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome ou ID do grupo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetch()}
                    disabled={isLoadingGroups}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingGroups ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Estado: Nenhuma sessao selecionada */}
      {!selectedSessionId && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Selecione uma sessao</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            Escolha uma sessao WhatsApp acima para visualizar os grupos disponíveis.
          </p>
        </div>
      )}

      {/* Estado: Carregando sessoes */}
      {isLoadingSessions && !sessions?.length && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando sessoes...</p>
          </div>
        </div>
      )}

      {/* Estado: Carregando grupos */}
      {selectedSessionId && isLoadingGroups && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando grupos...</p>
          </div>
        </div>
      )}

      {/* Estado: Erro */}
      {selectedSessionId && error && !isLoadingGroups && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
          <h3 className="text-lg font-medium">Erro ao carregar grupos</h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            {(error as Error).message || 'Erro desconhecido. Tente novamente.'}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Estado: Sem grupos */}
      {selectedSessionId && !isLoadingGroups && !error && filteredGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">
            {searchTerm ? 'Nenhum grupo encontrado' : 'Nenhum grupo nesta sessao'}
          </h3>
          <p className="text-muted-foreground mt-1 max-w-md">
            {searchTerm
              ? `Nenhum grupo corresponde a "${searchTerm}". Tente outro termo.`
              : 'Esta sessao ainda nao possui grupos. Crie um novo grupo adicionando membros em massa.'}
          </p>
          {!searchTerm && (
            <Button className="mt-4" asChild>
              <Link to={`/whatsapp/grupos/adicionar?session=${sessionName}`}>
                <UsersRound className="h-4 w-4 mr-2" />
                Criar Grupo
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Grid de grupos */}
      {selectedSessionId && !isLoadingGroups && !error && filteredGroups.length > 0 && (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredGroups.length} grupo{filteredGroups.length !== 1 ? 's' : ''}
              {searchTerm ? ` encontrado${filteredGroups.length !== 1 ? 's' : ''}` : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <Card
                key={group.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() =>
                  navigate(
                    `/whatsapp/grupos/${encodeURIComponent(group.id)}?session=${sessionName}`
                  )
                }
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{group.subject || 'Sem nome'}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                        {group.id}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {group.size ?? group.participants?.length ?? 0} membros
                        </Badge>
                      </div>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
