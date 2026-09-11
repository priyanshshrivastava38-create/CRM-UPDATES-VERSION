import { parse } from "csv-parse/sync";

export type CsvUsageRow = { usageDate: Date; component: string; quantity: number; sourceReference?: string };
export type CsvParseError = { row: number; message: string };
export type CsvParseResult = { rows: CsvUsageRow[]; errors: CsvParseError[] };

export function parseUsageCsv(text: string): CsvParseResult {
  let records: Record<string, string>[];
  try {
    records = parse(text, {
      columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true
    });
  } catch (error) {
    return { rows: [], errors: [{ row: 0, message: `Could not parse CSV: ${(error as Error).message}` }] };
  }

  const rows: CsvUsageRow[] = [];
  const errors: CsvParseError[] = [];

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const dateStr = record.date ?? record.usagedate;
    const component = record.component;
    const quantityStr = record.quantity;
    const reference = record.reference ?? record.sourcereference;

    if (!dateStr || !component || !quantityStr) {
      errors.push({ row: rowNumber, message: "Missing a required column (date, component, quantity)" });
      return;
    }
    const usageDate = new Date(dateStr);
    if (Number.isNaN(usageDate.getTime())) {
      errors.push({ row: rowNumber, message: `Invalid date "${dateStr}"` });
      return;
    }
    const quantity = Number(quantityStr);
    if (!Number.isFinite(quantity) || quantity < 0) {
      errors.push({ row: rowNumber, message: `Invalid quantity "${quantityStr}"` });
      return;
    }
    rows.push({ usageDate, component: component.toUpperCase(), quantity: Math.round(quantity), sourceReference: reference || undefined });
  });

  return { rows, errors };
}
