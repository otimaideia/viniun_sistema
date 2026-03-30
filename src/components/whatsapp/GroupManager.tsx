// Componente para gerenciamento de Grupos WhatsApp

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  UserPlus,
  UserMinus,
  Crown,
  Settings,
  Loader2,
  Plus,
  LogOut,
  RefreshCw,
  Shield,
  ShieldOff,
} from 'lucide-react';
import { useGroups, type WhatsAppGroup, type GroupParticipant } from '@/hooks/whatsapp/useGroups';
import { toast } from 'sonner';

interface GroupManagerProps {
  sessionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GroupManager: React.FC<GroupManagerProps> = ({
  sessionName,
  open,
  onOpenChange,
}) => {
  const {
    groups,
    isLoading,
    createGroup,
    isCreating,
    refetch,
  } = useGroups({ sessionName, enabled: open });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WhatsAppGroup | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Grupos WhatsApp
            </DialogTitle>
            <DialogDescription>
              Gerencie seus grupos do WhatsApp
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Grupo
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum grupo encontrado</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setShowCreateDialog(true)}
              >
                Criar primeiro grupo
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onClick={() => setSelectedGroup(group)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de criar grupo */}
      <CreateGroupDialog
        sessionName={sessionName}
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={(data) => {
          createGroup.mutate(data, {
            onSuccess: () => setShowCreateDialog(false),
          });
        }}
        isCreating={isCreating}
      />

      {/* Dialog de detalhes do grupo */}
      {selectedGroup && (
        <GroupDetailsDialog
          sessionName={sessionName}
          group={selectedGroup}
          open={!!selectedGroup}
          onOpenChange={(open) => !open && setSelectedGroup(null)}
        />
      )}
    </>
  );
};

// Card de grupo na lista
const GroupCard: React.FC<{
  group: WhatsAppGroup;
  onClick: () => void;
}> = ({ group, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={group.profilePictureUrl} />
        <AvatarFallback className="bg-green-100 text-green-700">
          <Users className="h-6 w-6" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{group.name}</p>
        <p className="text-sm text-muted-foreground">
          {group.participantsCount} participantes
        </p>
      </div>
      {group.isAnnounce && (
        <Badge variant="secondary" className="text-xs">
          Somente admins
        </Badge>
      )}
    </button>
  );
};

// Dialog de criar grupo
const CreateGroupDialog: React.FC<{
  sessionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; participants: string[] }) => void;
  isCreating: boolean;
}> = ({ open, onOpenChange, onCreate, isCreating }) => {
  const [name, setName] = useState('');
  const [participantsText, setParticipantsText] = useState('');

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Digite um nome para o grupo');
      return;
    }

    const participants = participantsText
      .split(/[\n,;]/)
      .map((p) => p.replace(/\D/g, '').trim())
      .filter((p) => p.length >= 10);

    if (participants.length === 0) {
      toast.error('Adicione pelo menos um participante');
      return;
    }

    onCreate({ name: name.trim(), participants });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Grupo</DialogTitle>
          <DialogDescription>
            Crie um novo grupo e adicione participantes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="group-name">Nome do Grupo</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Equipe de Vendas"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="participants">Participantes (números)</Label>
            <Textarea
              id="participants"
              value={participantsText}
              onChange={(e) => setParticipantsText(e.target.value)}
              placeholder="5511999999999&#10;5511888888888&#10;(um número por linha)"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Digite os números dos participantes, um por linha
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Dialog de detalhes do grupo
const GroupDetailsDialog: React.FC<{
  sessionName: string;
  group: WhatsAppGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ sessionName, group, open, onOpenChange }) => {
  const {
    updateGroupName,
    updateGroupDescription,
    addParticipants,
    removeParticipants,
    promoteToAdmin,
    demoteAdmin,
    leaveGroup,
    isUpdating,
    isManagingParticipants,
  } = useGroups({ sessionName, enabled: open });

  const [activeTab, setActiveTab] = useState('info');
  const [newName, setNewName] = useState(group.name);
  const [newDescription, setNewDescription] = useState(group.description || '');
  const [newParticipant, setNewParticipant] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleUpdateInfo = () => {
    if (newName !== group.name) {
      updateGroupName.mutate({ groupId: group.id, name: newName });
    }
    if (newDescription !== group.description) {
      updateGroupDescription.mutate({ groupId: group.id, description: newDescription });
    }
  };

  const handleAddParticipant = () => {
    const phone = newParticipant.replace(/\D/g, '');
    if (phone.length < 10) {
      toast.error('Número inválido');
      return;
    }
    addParticipants.mutate(
      { groupId: group.id, participants: [phone] },
      { onSuccess: () => setNewParticipant('') }
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={group.profilePictureUrl} />
                <AvatarFallback>
                  <Users className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              {group.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">
                <Settings className="h-4 w-4 mr-1" />
                Info
              </TabsTrigger>
              <TabsTrigger value="participants">
                <Users className="h-4 w-4 mr-1" />
                Membros
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Shield className="h-4 w-4 mr-1" />
                Config
              </TabsTrigger>
            </TabsList>

            {/* Aba de Informações */}
            <TabsContent value="info" className="space-y-4">
              <div>
                <Label>Nome do Grupo</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  maxLength={512}
                />
              </div>
              <Button
                onClick={handleUpdateInfo}
                disabled={isUpdating || (newName === group.name && newDescription === group.description)}
              >
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </TabsContent>

            {/* Aba de Participantes */}
            <TabsContent value="participants" className="space-y-4">
              {/* Adicionar participante */}
              <div className="flex gap-2">
                <Input
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  placeholder="5511999999999"
                  className="flex-1"
                />
                <Button
                  onClick={handleAddParticipant}
                  disabled={isManagingParticipants}
                  size="icon"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              {/* Lista de participantes */}
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {group.participants.map((participant) => (
                    <ParticipantCard
                      key={participant.id}
                      participant={participant}
                      groupId={group.id}
                      onRemove={() => {
                        removeParticipants.mutate({
                          groupId: group.id,
                          participants: [participant.id],
                        });
                      }}
                      onPromote={() => {
                        promoteToAdmin.mutate({
                          groupId: group.id,
                          participants: [participant.id],
                        });
                      }}
                      onDemote={() => {
                        demoteAdmin.mutate({
                          groupId: group.id,
                          participants: [participant.id],
                        });
                      }}
                      isLoading={isManagingParticipants}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Aba de Configurações */}
            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Somente admins enviam mensagens</p>
                    <p className="text-sm text-muted-foreground">
                      {group.isAnnounce ? 'Ativado' : 'Desativado'}
                    </p>
                  </div>
                  <Badge variant={group.isAnnounce ? 'default' : 'secondary'}>
                    {group.isAnnounce ? 'ON' : 'OFF'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Somente admins editam info</p>
                    <p className="text-sm text-muted-foreground">
                      {group.isReadOnly ? 'Ativado' : 'Desativado'}
                    </p>
                  </div>
                  <Badge variant={group.isReadOnly ? 'default' : 'secondary'}>
                    {group.isReadOnly ? 'ON' : 'OFF'}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowLeaveConfirm(true)}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair do Grupo
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Confirmação para sair do grupo */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja sair do grupo "{group.name}"?
              Você não poderá mais ver as mensagens deste grupo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                leaveGroup.mutate(group.id);
                setShowLeaveConfirm(false);
                onOpenChange(false);
              }}
            >
              Sair do Grupo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Card de participante
const ParticipantCard: React.FC<{
  participant: GroupParticipant;
  groupId: string;
  onRemove: () => void;
  onPromote: () => void;
  onDemote: () => void;
  isLoading: boolean;
}> = ({ participant, onRemove, onPromote, onDemote, isLoading }) => {
  const phoneNumber = participant.id.replace('@c.us', '');

  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {phoneNumber.slice(-2)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{phoneNumber}</p>
          {(participant.isAdmin || participant.isSuperAdmin) && (
            <Badge variant="secondary" className="text-xs">
              {participant.isSuperAdmin ? 'Criador' : 'Admin'}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {!participant.isSuperAdmin && (
          <>
            {participant.isAdmin ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onDemote}
                disabled={isLoading}
                title="Remover admin"
              >
                <ShieldOff className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onPromote}
                disabled={isLoading}
                title="Promover a admin"
              >
                <Crown className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={isLoading}
              title="Remover do grupo"
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default GroupManager;
