import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { MarketingCampanha } from "@/types/marketing";

interface CampanhaCalendarProps {
  campanhas: MarketingCampanha[];
  onCampanhaClick?: (campanha: MarketingCampanha) => void;
}

const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function CampanhaCalendar({ campanhas, onCampanhaClick }: CampanhaCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Calcula os dias do mês
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: Array<{
      date: Date | null;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Dias do mês anterior
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentYear, currentMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Dias do mês atual
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday:
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear(),
      });
    }

    // Dias do próximo mês para completar a grade
    const remainingDays = 42 - days.length; // 6 semanas x 7 dias
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(currentYear, currentMonth + 1, i),
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Mapeia campanhas por data
  const campanhasByDate = useMemo(() => {
    const map = new Map<string, MarketingCampanha[]>();

    campanhas.forEach((campanha) => {
      if (!campanha.data_inicio) return;

      const startDate = new Date(campanha.data_inicio);
      const endDate = campanha.data_fim ? new Date(campanha.data_fim) : startDate;

      // Adiciona a campanha em cada dia do range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split("T")[0];
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(campanha);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    return map;
  }, [campanhas]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ativa":
        return "bg-green-500";
      case "pausada":
        return "bg-amber-500";
      case "finalizada":
        return "bg-gray-400";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario de Campanhas
            </CardTitle>
            <CardDescription>
              Visualize suas campanhas no calendario
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium min-w-[180px] text-center">
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Header dos dias da semana */}
        <div className="grid grid-cols-7 gap-px mb-2">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid do calendário */}
        <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
          {calendarDays.map((day, index) => {
            if (!day.date) return null;

            const dateKey = day.date.toISOString().split("T")[0];
            const dayCampanhas = campanhasByDate.get(dateKey) || [];

            return (
              <div
                key={day.date.toISOString()}
                className={`min-h-[100px] p-1 bg-background ${
                  !day.isCurrentMonth ? "opacity-40" : ""
                } ${day.isToday ? "ring-2 ring-primary ring-inset" : ""}`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    day.isToday
                      ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
                      : ""
                  }`}
                >
                  {day.date.getDate()}
                </div>
                <div className="space-y-0.5">
                  <TooltipProvider>
                    {dayCampanhas.slice(0, 3).map((campanha) => (
                      <Tooltip key={campanha.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onCampanhaClick?.(campanha)}
                            className={`w-full text-left text-xs truncate px-1 py-0.5 rounded ${getStatusColor(
                              campanha.status
                            )} text-white hover:opacity-80 transition-opacity`}
                          >
                            {campanha.nome}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{campanha.nome}</p>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  campanha.status === "ativa"
                                    ? "default"
                                    : campanha.status === "pausada"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {campanha.status}
                              </Badge>
                            </div>
                            {campanha.descricao && (
                              <p className="text-xs text-muted-foreground">
                                {campanha.descricao.substring(0, 100)}...
                              </p>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {campanha.data_inicio &&
                                new Date(campanha.data_inicio).toLocaleDateString("pt-BR")}
                              {campanha.data_fim &&
                                ` - ${new Date(campanha.data_fim).toLocaleDateString("pt-BR")}`}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {dayCampanhas.length > 3 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="w-full text-left text-xs text-muted-foreground hover:text-foreground">
                            +{dayCampanhas.length - 3} mais
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="space-y-1">
                            {dayCampanhas.slice(3).map((c) => (
                              <p key={c.id} className="text-xs">
                                {c.nome}
                              </p>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Ativa</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>Pausada</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-400" />
            <span>Finalizada</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
