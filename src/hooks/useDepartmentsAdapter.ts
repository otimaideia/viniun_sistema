// =============================================================================
// USE DEPARTMENTS ADAPTER - Hook Multi-Tenant REAL
// =============================================================================
//
// Adapter para gestão de departamentos
// SISTEMA 100% MT - Usa mt_departments diretamente via useDepartments
//
// =============================================================================

// Re-exportar tipos do módulo MT
export type { Department } from '@/types/multitenant';

// Re-exportar hooks MT diretamente
export {
  useDepartments as useDepartmentsAdapter,
  useDepartment as useDepartmentAdapter,
  useUserDepartments as useUserDepartmentsAdapter,
} from './multitenant/useDepartments';

// =============================================================================
// Helper: Verificar modo atual (sempre MT)
// =============================================================================

export function getDepartmentsMode(): 'mt' {
  return 'mt';
}

// Export default = hook principal
export { useDepartments as default } from './multitenant/useDepartments';
