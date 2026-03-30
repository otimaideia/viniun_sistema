import { DepreciationMethod, DepreciationScheduleEntry, MTAsset } from '@/types/patrimonio';

// =============================================================================
// Depreciation Calculation Library
// =============================================================================
// 4 methods: straight_line, declining_balance, sum_of_years, units_of_production
// Supports pro-rata (partial year) and fully-depreciated assets
// =============================================================================

/**
 * Calculate straight-line depreciation per year
 * Formula: (cost - salvage) / useful_life_years
 */
function straightLine(cost: number, salvage: number, usefulLifeYears: number): number {
  if (usefulLifeYears <= 0) return 0;
  return (cost - salvage) / usefulLifeYears;
}

/**
 * Calculate declining balance depreciation for a given book value
 * Formula: book_value × (2 / useful_life_years)
 */
function decliningBalance(bookValue: number, usefulLifeYears: number, salvage: number): number {
  if (usefulLifeYears <= 0) return 0;
  const rate = 2 / usefulLifeYears;
  const dep = bookValue * rate;
  // Don't depreciate below salvage value
  if (bookValue - dep < salvage) {
    return Math.max(0, bookValue - salvage);
  }
  return dep;
}

/**
 * Calculate sum of years' digits depreciation
 * Formula: (remaining_life / sum_of_digits) × (cost - salvage)
 * Sum of digits = n(n+1)/2
 */
function sumOfYears(cost: number, salvage: number, usefulLifeYears: number, currentYear: number): number {
  if (usefulLifeYears <= 0 || currentYear > usefulLifeYears) return 0;
  const sumDigits = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
  const remainingLife = usefulLifeYears - currentYear + 1;
  return (remainingLife / sumDigits) * (cost - salvage);
}

/**
 * Calculate units of production depreciation
 * Formula: (cost - salvage) × (units_this_period / total_expected_units)
 */
function unitsOfProduction(cost: number, salvage: number, totalUnits: number, unitsThisPeriod: number): number {
  if (totalUnits <= 0) return 0;
  return ((cost - salvage) / totalUnits) * unitsThisPeriod;
}

/**
 * Calculate pro-rata factor for partial year
 * Returns fraction of year based on months in service
 */
function proRataFactor(startDate: string, year: number): number {
  const start = new Date(startDate);
  const startYear = start.getFullYear();

  if (year < startYear) return 0;

  // First year: count months from start to end of year
  if (year === startYear) {
    const startMonth = start.getMonth(); // 0-based
    return (12 - startMonth) / 12;
  }

  // Full year
  return 1;
}

/**
 * Generate complete depreciation schedule for an asset
 */
export function generateDepreciationSchedule(asset: MTAsset): DepreciationScheduleEntry[] {
  const {
    valor_aquisicao: cost,
    valor_residual: salvage,
    vida_util_anos: usefulLife,
    metodo_depreciacao: method,
    data_inicio_uso,
    unidades_total_esperadas,
  } = asset;

  if (!usefulLife || usefulLife <= 0 || cost <= salvage) return [];

  const depreciableAmount = cost - salvage;
  if (depreciableAmount <= 0) return [];

  const startDate = data_inicio_uso || asset.data_aquisicao;
  const startYear = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();

  const schedule: DepreciationScheduleEntry[] = [];
  let accumulated = 0;
  let bookValue = cost;

  for (let i = 1; i <= usefulLife; i++) {
    let periodDep = 0;

    switch (method) {
      case 'straight_line':
        periodDep = straightLine(cost, salvage, usefulLife);
        break;
      case 'declining_balance':
        periodDep = decliningBalance(bookValue, usefulLife, salvage);
        break;
      case 'sum_of_years':
        periodDep = sumOfYears(cost, salvage, usefulLife, i);
        break;
      case 'units_of_production':
        // For schedule, distribute evenly (actual will vary)
        periodDep = unitsOfProduction(cost, salvage, unidades_total_esperadas || usefulLife, 1);
        break;
    }

    // Pro-rata for first year
    if (i === 1 && startDate) {
      const factor = proRataFactor(startDate, startYear);
      periodDep = periodDep * factor;
    }

    // Clamp: don't exceed depreciable amount
    if (accumulated + periodDep > depreciableAmount) {
      periodDep = depreciableAmount - accumulated;
    }

    // Round to 2 decimal places
    periodDep = Math.round(periodDep * 100) / 100;

    accumulated += periodDep;
    accumulated = Math.round(accumulated * 100) / 100;
    bookValue = Math.round((cost - accumulated) * 100) / 100;

    schedule.push({
      ano: startYear + i - 1,
      depreciacao_periodo: periodDep,
      depreciacao_acumulada: accumulated,
      valor_contabil: bookValue,
    });

    // Stop if fully depreciated
    if (bookValue <= salvage) break;
  }

  return schedule;
}

/**
 * Calculate current book value considering pro-rata up to reference date
 */
export function calculateCurrentBookValue(asset: MTAsset, referenceDate?: Date): number {
  const ref = referenceDate || new Date();
  const schedule = generateDepreciationSchedule(asset);

  if (schedule.length === 0) return asset.valor_aquisicao;

  const refYear = ref.getFullYear();

  // Find the entry for current year or last available
  let lastEntry = schedule[0];
  for (const entry of schedule) {
    if (entry.ano <= refYear) {
      lastEntry = entry;
    } else {
      break;
    }
  }

  return Math.max(lastEntry.valor_contabil, asset.valor_residual);
}

/**
 * Calculate depreciation for a specific method and params (standalone)
 */
export function calculateDepreciation(
  method: DepreciationMethod,
  cost: number,
  salvage: number,
  usefulLifeYears: number,
  options?: {
    bookValue?: number;
    currentYear?: number;
    totalUnits?: number;
    unitsThisPeriod?: number;
  }
): number {
  switch (method) {
    case 'straight_line':
      return straightLine(cost, salvage, usefulLifeYears);
    case 'declining_balance':
      return decliningBalance(options?.bookValue ?? cost, usefulLifeYears, salvage);
    case 'sum_of_years':
      return sumOfYears(cost, salvage, usefulLifeYears, options?.currentYear ?? 1);
    case 'units_of_production':
      return unitsOfProduction(cost, salvage, options?.totalUnits ?? 1, options?.unitsThisPeriod ?? 1);
    default:
      return 0;
  }
}

/**
 * Check if asset is fully depreciated
 */
export function isFullyDepreciated(asset: MTAsset): boolean {
  return asset.depreciacao_acumulada >= (asset.valor_aquisicao - asset.valor_residual);
}

/**
 * Calculate remaining useful life in years
 */
export function remainingUsefulLife(asset: MTAsset): number {
  if (!asset.data_inicio_uso) return asset.vida_util_anos;
  const start = new Date(asset.data_inicio_uso);
  const now = new Date();
  const yearsUsed = (now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.max(0, asset.vida_util_anos - Math.floor(yearsUsed));
}

/**
 * Format currency BRL
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
