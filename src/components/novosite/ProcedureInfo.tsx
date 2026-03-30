import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Repeat,
} from "lucide-react";

interface ProcedureInfoProps {
  descricao?: string | null;
  beneficios?: string[] | null;
  contraindicacoes?: string | null;
  preparo?: string | null;
  posProcedimento?: string | null;
  equipamento?: string | null;
  duracaoMinutos?: number | null;
  sessoesProtocolo?: number | null;
}

interface TabDef {
  value: string;
  label: string;
  hasContent: boolean;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function ProcedureInfo({
  descricao,
  beneficios,
  contraindicacoes,
  preparo,
  posProcedimento,
  equipamento,
  duracaoMinutos,
  sessoesProtocolo,
}: ProcedureInfoProps) {
  const tabs: TabDef[] = [
    { value: "sobre", label: "Sobre", hasContent: true },
    {
      value: "beneficios",
      label: "Beneficios",
      hasContent: !!beneficios && beneficios.length > 0,
    },
    {
      value: "preparo",
      label: "Preparo",
      hasContent: !!preparo,
    },
    {
      value: "pos",
      label: "Pos-procedimento",
      hasContent: !!posProcedimento,
    },
  ];

  const visibleTabs = tabs.filter((t) => t.hasContent);
  const defaultTab = visibleTabs[0]?.value || "sobre";

  const hasMetadata = equipamento || duracaoMinutos || sessoesProtocolo;

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-0">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 gap-0">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-5 py-3 text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Sobre */}
          <TabsContent value="sobre" className="p-5 space-y-4 mt-0">
            {/* Quick info badges */}
            {hasMetadata && (
              <div className="flex flex-wrap gap-3">
                {equipamento && (
                  <div className="flex items-center gap-2 text-sm bg-muted rounded-lg px-3 py-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    <span>{equipamento}</span>
                  </div>
                )}
                {duracaoMinutos && duracaoMinutos > 0 && (
                  <div className="flex items-center gap-2 text-sm bg-muted rounded-lg px-3 py-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{formatDuration(duracaoMinutos)}</span>
                  </div>
                )}
                {sessoesProtocolo && sessoesProtocolo > 0 && (
                  <div className="flex items-center gap-2 text-sm bg-muted rounded-lg px-3 py-2">
                    <Repeat className="w-4 h-4 text-primary" />
                    <span>
                      {sessoesProtocolo} sess
                      {sessoesProtocolo === 1 ? "ao" : "oes"}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {descricao ? (
              <div
                className="prose prose-sm max-w-none text-muted-foreground leading-relaxed"
                dangerouslySetInnerHTML={{ __html: descricao }}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Informacoes detalhadas em breve.
              </p>
            )}

            {/* Contraindications warning */}
            {contraindicacoes && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800 mb-1">
                      Contraindicacoes
                    </h4>
                    <p className="text-sm text-amber-700 leading-relaxed whitespace-pre-line">
                      {contraindicacoes}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Beneficios */}
          {beneficios && beneficios.length > 0 && (
            <TabsContent value="beneficios" className="p-5 mt-0">
              <ul className="space-y-3">
                {beneficios.map((beneficio, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground leading-relaxed">
                      {beneficio}
                    </span>
                  </li>
                ))}
              </ul>
            </TabsContent>
          )}

          {/* Preparo */}
          {preparo && (
            <TabsContent value="preparo" className="p-5 mt-0">
              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                {preparo}
              </div>
            </TabsContent>
          )}

          {/* Pos-procedimento */}
          {posProcedimento && (
            <TabsContent value="pos" className="p-5 mt-0">
              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                {posProcedimento}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
