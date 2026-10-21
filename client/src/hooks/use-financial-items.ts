import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FinancialItem } from "@shared/schema";
import { currentItems } from "@shared/finance-schedule";
import { localDay } from "@/lib/quotes";

// The finance rows in force today: ones that ended or have not started yet (a bill that changes on a set date) are left out.
export function useCurrentFinancialItems(): FinancialItem[] {
  const day = localDay();
  const { data = [] } = useQuery<FinancialItem[]>({ queryKey: ["/api/finances"] });
  return useMemo(() => currentItems(data, day), [data, day]);
}
