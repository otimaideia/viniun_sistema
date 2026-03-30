import { MTDashboardProfile, MTDashboardBoard, MTDashboardBoardWidget } from '@/types/dashboard';
import { DashboardGrid } from './DashboardGrid';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface DynamicDashboardProps {
  profile: MTDashboardProfile;
  boards: MTDashboardBoard[];
  activeBoard: MTDashboardBoard;
  widgets: MTDashboardBoardWidget[];
  onSelectBoard: (boardId: string) => void;
  onResetLayout?: { mutate: () => void } | (() => void);
}

export function DynamicDashboard({ profile, boards, activeBoard, widgets, onSelectBoard, onResetLayout }: DynamicDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(() => {
            const Icon = profile.icone ? (LucideIcons as any)[profile.icone] || LucideIcons.LayoutDashboard : LucideIcons.LayoutDashboard;
            return <Icon className="h-6 w-6 text-primary" style={profile.cor ? { color: profile.cor } : undefined} />;
          })()}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{profile.nome}</h1>
            {profile.descricao && (
              <p className="text-sm text-muted-foreground">{profile.descricao}</p>
            )}
          </div>
        </div>
        {onResetLayout && (
          <Button variant="ghost" size="sm" onClick={() => {
            if (typeof onResetLayout === 'function') onResetLayout();
            else if (onResetLayout && 'mutate' in onResetLayout) onResetLayout.mutate();
          }}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Resetar
          </Button>
        )}
      </div>

      {/* Board Tabs */}
      {boards.length > 1 && (
        <Tabs value={activeBoard.id} onValueChange={onSelectBoard}>
          <TabsList>
            {boards.map(board => {
              const BoardIcon = board.icone ? (LucideIcons as any)[board.icone] || LucideIcons.LayoutDashboard : LucideIcons.LayoutDashboard;
              return (
                <TabsTrigger key={board.id} value={board.id} className="gap-1.5">
                  <BoardIcon className="h-4 w-4" />
                  {board.nome}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      )}

      {/* Widget Grid */}
      <DashboardGrid widgets={widgets} />
    </div>
  );
}
