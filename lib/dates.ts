import { format, parseISO } from "date-fns";
import { fi } from "date-fns/locale";

/** Finnish date format: 7.8.2026 */
export function formatFiDate(iso: string | Date): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, "d.M.yyyy", { locale: fi });
}

/** Finnish month + year for calendar header: elokuu 2026 */
export function formatFiMonthYear(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return format(d, "LLLL yyyy", { locale: fi });
}

/** Short weekday labels Mon–Sun in Finnish */
export const FI_WEEKDAYS = ["ma", "ti", "ke", "to", "pe", "la", "su"];
