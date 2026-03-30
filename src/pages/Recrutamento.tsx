import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Users, Briefcase, UserCheck, Calendar, RefreshCw, LayoutDashboard, MessageCircle,
} from "lucide-react";
import { useVagasMT } from "@/hooks/multitenant/useVagasMT";
import { useCandidatosMT } from "@/hooks/multitenant/useCandidatosMT";
import { useEntrevistasMT } from "@/hooks/multitenant/useEntrevistasMT";
import { RecrutamentoDashboard } from "@/components/recrutamento/RecrutamentoDashboard";
import { VagasTab } from "@/components/recrutamento/VagasTab";
import { CandidatosTab } from "@/components/recrutamento/CandidatosTab";
import { EntrevistasTab } from "@/components/recrutamento/EntrevistasTab";
import { WhatsAppCurriculosTab } from "@/components/recrutamento/WhatsAppCurriculosTab";

export default function Recrutamento() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const { refetch: refetchVagas } = useVagasMT();
  const { refetch: refetchCandidatos } = useCandidatosMT();
  const { refetch: refetchEntrevistas } = useEntrevistasMT();

  const handleRefresh = () => {
    refetchVagas();
    refetchCandidatos();
    refetchEntrevistas();
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Recrutamento
            </h1>
            <p className="text-muted-foreground">
              Gerencie vagas, candidatos e entrevistas
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="vagas" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Vagas</span>
            </TabsTrigger>
            <TabsTrigger value="candidatos" className="gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Candidatos</span>
            </TabsTrigger>
            <TabsTrigger value="entrevistas" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Entrevistas</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <RecrutamentoDashboard />
          </TabsContent>

          <TabsContent value="vagas">
            <VagasTab />
          </TabsContent>

          <TabsContent value="candidatos">
            <CandidatosTab />
          </TabsContent>

          <TabsContent value="entrevistas">
            <EntrevistasTab />
          </TabsContent>

          <TabsContent value="whatsapp">
            <WhatsAppCurriculosTab />
          </TabsContent>
        </Tabs>
      </div>
  );
}
