import { format, isToday, isPast } from "date-fns";

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function dateLabel(value?: string | Date | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  if (isToday(date)) return `Today, ${format(date, "h:mm a")}`;
  return format(date, "dd MMM yyyy");
}

export function taskBucket(dueDate: Date, completed: boolean) {
  if (completed) return "Completed";
  if (Number.isNaN(dueDate.getTime())) return "Overdue";
  if (isToday(dueDate)) return "Today";
  if (isPast(dueDate)) return "Overdue";
  return "Upcoming";
}

export function pct(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}
