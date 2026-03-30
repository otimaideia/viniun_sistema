import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Award, Users, TrendingUp } from "lucide-react";
import type { IndicacaoLeaderboardItem } from "@/types/indicacao";
import { safeGetInitials } from "@/utils/unicodeSanitizer";

interface IndicacaoLeaderboardProps {
  leaderboard: IndicacaoLeaderboardItem[];
  isLoading?: boolean;
  limit?: number;
  className?: string;
}

export function IndicacaoLeaderboard({
  leaderboard,
  isLoading,
  limit = 10,
  className,
}: IndicacaoLeaderboardProps) {
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="h-5 w-5 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {position}
          </span>
        );
    }
  };

  const getPositionBadge = (position: number) => {
    switch (position) {
      case 1:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case 2:
        return "bg-gray-100 text-gray-800 border-gray-300";
      case 3:
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Ranking de Indicadores
        </CardTitle>
        <CardDescription>
          Top {limit} leads que mais indicaram pessoas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma indicacao registrada ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.slice(0, limit).map((item, index) => {
              const position = index + 1;
              return (
                <div
                  key={item.lead_id}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    position <= 3 ? "bg-muted/50" : "hover:bg-muted/30"
                  }`}
                >
                  {/* Posicao */}
                  <div className={`flex items-center justify-center h-8 w-8 rounded-full ${getPositionBadge(position)}`}>
                    {getPositionIcon(position)}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={position <= 3 ? "bg-primary/10 text-primary" : ""}>
                      {safeGetInitials(item.nome)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.nome}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {item.franqueado_nome && (
                        <span className="truncate">{item.franqueado_nome}</span>
                      )}
                    </div>
                  </div>

                  {/* Indicacoes */}
                  <div className="text-right">
                    <Badge
                      variant={position <= 3 ? "default" : "secondary"}
                      className="gap-1"
                    >
                      <TrendingUp className="h-3 w-3" />
                      {item.quantidade_indicacoes}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.indicacoes_convertidas > 0 && (
                        <span className="text-emerald-600">
                          {item.indicacoes_convertidas} convertidas
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
