export type MultiDayBudgetMode = "PER_DAY" | "TOTAL_EVENT"

export type MultiDayBudgetDraft = {
  budgetMode?: string | null
  budget?: string | number | null
  totalBudget?: string | number | null
  defaultDailyBudget?: string | number | null
}

export function toPositiveBudgetNumber(value?: string | number | null): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function normalizeMultiDayBudgetMode(value?: string | null): MultiDayBudgetMode | null {
  return value === "PER_DAY" || value === "TOTAL_EVENT" ? value : null
}

export function restoreMultiDayBudgetDraft(draft: MultiDayBudgetDraft) {
  const explicitMode = normalizeMultiDayBudgetMode(draft.budgetMode)
  const inferredMode: MultiDayBudgetMode = explicitMode ?? (draft.defaultDailyBudget != null ? "PER_DAY" : "TOTAL_EVENT")
  const fallbackBudget = draft.budget ?? null

  if (inferredMode === "PER_DAY") {
    const defaultDailyBudget = draft.defaultDailyBudget ?? fallbackBudget ?? ""
    return {
      budgetMode: "PER_DAY" as const,
      totalBudget: "",
      defaultDailyBudget: defaultDailyBudget == null ? "" : String(defaultDailyBudget),
      dateBudget: defaultDailyBudget == null ? "" : String(defaultDailyBudget),
    }
  }

  const totalBudget = draft.totalBudget ?? fallbackBudget ?? ""
  return {
    budgetMode: "TOTAL_EVENT" as const,
    totalBudget: totalBudget == null ? "" : String(totalBudget),
    defaultDailyBudget: "",
    dateBudget: "",
  }
}

export function calculateMultiDayBudgetTotal(input: {
  budgetMode: MultiDayBudgetMode
  totalBudget?: string | number | null
  defaultDailyBudget?: string | number | null
  dateBudgets?: Array<string | number | null | undefined>
}): number {
  if (input.budgetMode === "TOTAL_EVENT") {
    return toPositiveBudgetNumber(input.totalBudget) ?? 0
  }

  return (input.dateBudgets ?? []).reduce<number>((sum, value) => {
    return sum + (toPositiveBudgetNumber(value) ?? toPositiveBudgetNumber(input.defaultDailyBudget) ?? 0)
  }, 0)
}

export function canonicalizeMultiDayBudgetInput(input: {
  budgetMode: MultiDayBudgetMode
  budget?: number | null
  totalBudget?: number | null
  defaultDailyBudget?: number | null
  dateBudgets?: Array<number | null | undefined>
}) {
  const totalBudget = input.budgetMode === "TOTAL_EVENT"
    ? toPositiveBudgetNumber(input.totalBudget) ?? toPositiveBudgetNumber(input.budget) ?? 0
    : calculateMultiDayBudgetTotal({
        budgetMode: "PER_DAY",
        defaultDailyBudget: input.defaultDailyBudget,
        dateBudgets: input.dateBudgets ?? [],
      })

  return {
    budget: totalBudget,
    totalBudget,
    defaultDailyBudget: input.budgetMode === "PER_DAY" ? toPositiveBudgetNumber(input.defaultDailyBudget) : null,
  }
}
