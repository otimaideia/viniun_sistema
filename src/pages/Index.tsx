import { useDashboardProfileMT } from "@/hooks/multitenant/useDashboardProfileMT";
import { DynamicDashboard } from "@/components/dashboard/DynamicDashboard";
import { LegacyDashboard } from "@/components/dashboard/LegacyDashboard";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const {
    profile,
    boards,
    activeBoard,
    widgets,
    isLoading,
    selectBoard,
    hideWidget,
    showWidget,
    resetLayout,
  } = useDashboardProfileMT();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  // Dashboard dinâmico se perfil configurado com widgets
  if (profile && activeBoard && widgets.length > 0) {
    return (
      <DynamicDashboard
        profile={profile}
        boards={boards}
        activeBoard={activeBoard}
        widgets={widgets}
        onSelectBoard={selectBoard}
        onResetLayout={resetLayout}
      />
    );
  }

  // Fallback → dashboard hardcoded atual
  return <LegacyDashboard />;
};

export default Index;
