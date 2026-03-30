import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Building2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useOnboardingAdapter, ONBOARDING_STEPS } from '@/hooks/useOnboardingAdapter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Steps
import StepDadosEmpresa from './steps/StepDadosEmpresa';
import StepEndereco from './steps/StepEndereco';
import StepResponsavel from './steps/StepResponsavel';
import StepBranding from './steps/StepBranding';
import StepConfiguracoes from './steps/StepConfiguracoes';
import StepPlano from './steps/StepPlano';
import StepModulos from './steps/StepModulos';
import StepAdminMaster from './steps/StepAdminMaster';
import StepFranquia from './steps/StepFranquia';
import StepRevisao from './steps/StepRevisao';

// =============================================================================
// PÁGINA: TenantOnboarding
// Wizard de onboarding para criar nova empresa (tenant)
// =============================================================================

export default function TenantOnboarding() {
  const navigate = useNavigate();
  const {
    currentStep,
    data,
    isSubmitting,
    completedSteps,
    createdTenantId,
    steps,
    updateStepData,
    nextStep,
    prevStep,
    goToStep,
    canProceed,
    isStepComplete,
    submitOnboarding,
  } = useOnboardingAdapter();

  // Renderizar passo atual
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepDadosEmpresa
            data={data.empresa}
            onUpdate={(stepData) => updateStepData('empresa', stepData)}
          />
        );
      case 2:
        return (
          <StepEndereco
            data={data.endereco}
            onUpdate={(stepData) => updateStepData('endereco', stepData)}
          />
        );
      case 3:
        return (
          <StepResponsavel
            data={data.responsavel}
            onUpdate={(stepData) => updateStepData('responsavel', stepData)}
          />
        );
      case 4:
        return (
          <StepBranding
            data={data.branding}
            onUpdate={(stepData) => updateStepData('branding', stepData)}
          />
        );
      case 5:
        return (
          <StepConfiguracoes
            data={data.configuracoes}
            onUpdate={(stepData) => updateStepData('configuracoes', stepData)}
          />
        );
      case 6:
        return (
          <StepPlano
            data={data.plano}
            onUpdate={(stepData) => updateStepData('plano', stepData)}
          />
        );
      case 7:
        return (
          <StepModulos
            data={data.modulos}
            onUpdate={(stepData) => updateStepData('modulos', stepData)}
          />
        );
      case 8:
        return (
          <StepAdminMaster
            data={data.admin}
            onUpdate={(stepData) => updateStepData('admin', stepData)}
          />
        );
      case 9:
        return (
          <StepFranquia
            data={data.franquia}
            onUpdate={(stepData) => updateStepData('franquia', stepData)}
          />
        );
      case 10:
        return (
          <StepRevisao
            data={data}
            onEdit={goToStep}
          />
        );
      default:
        return null;
    }
  };

  // Handler para próximo passo ou submit
  const handleNext = async () => {
    if (currentStep === ONBOARDING_STEPS.length) {
      const success = await submitOnboarding();
      if (success) {
        navigate('/configuracoes/empresas');
      }
    } else {
      nextStep();
    }
  };

  // Verificar se já completou o onboarding
  if (createdTenantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Empresa Criada!</h2>
            <p className="text-muted-foreground mb-6">
              {data.empresa.nome_fantasia} foi configurada com sucesso.
            </p>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => navigate(`/configuracoes/empresas/${createdTenantId}`)}
              >
                Ver Empresa
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/configuracoes/empresas')}
              >
                Voltar para Lista
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Nova Empresa</h1>
              <p className="text-sm text-muted-foreground">
                Configure uma nova empresa no sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar com Stepper */}
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isComplete = isStepComplete(step.id);
              const isPast = step.id < currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => isPast || isComplete ? goToStep(step.id) : null}
                  disabled={!isPast && !isComplete && step.id !== currentStep}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                    isActive && 'bg-primary text-primary-foreground',
                    !isActive && isComplete && 'bg-green-50 hover:bg-green-100 cursor-pointer',
                    !isActive && isPast && !isComplete && 'bg-muted hover:bg-muted/80 cursor-pointer',
                    !isActive && !isPast && !isComplete && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0',
                      isActive && 'bg-primary-foreground/20 text-primary-foreground',
                      !isActive && isComplete && 'bg-green-500 text-white',
                      !isActive && !isComplete && 'bg-muted-foreground/20'
                    )}
                  >
                    {isComplete && !isActive ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      'font-medium truncate',
                      isActive && 'text-primary-foreground',
                      !isActive && 'text-foreground'
                    )}>
                      {step.title}
                      {step.isOptional && (
                        <span className="ml-1 text-xs opacity-70">(opcional)</span>
                      )}
                    </div>
                    <div className={cn(
                      'text-xs truncate',
                      isActive && 'text-primary-foreground/70',
                      !isActive && 'text-muted-foreground'
                    )}>
                      {step.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Conteúdo do Passo */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                {renderStep()}
              </CardContent>
            </Card>

            {/* Navegação */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>

              <div className="text-sm text-muted-foreground">
                Passo {currentStep} de {steps.length}
              </div>

              <Button
                onClick={handleNext}
                disabled={!canProceed(currentStep) || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : currentStep === steps.length ? (
                  <>
                    Criar Empresa
                    <Check className="w-4 h-4 ml-2" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
