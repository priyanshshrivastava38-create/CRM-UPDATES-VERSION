import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/rbac";
import { monthToPeriod } from "@/lib/validators";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const idsParam = searchParams.get("ids");

  const where = idsParam
    ? { id: { in: idsParam.split(",") } }
    : month
      ? { periodStart: monthToPeriod(month).periodStart }
      : {};

  const invoices = await prisma.invoice.findMany({
    where,
    include: { customer: { select: { customerCode: true, name: true } }, lineItems: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ periodStart: "desc" }, { invoiceNumber: "asc" }]
  });

  const headers = [
    "Invoice Number",
    "Invoice Status",
    "Customer Code",
    "Customer Name",
    "Billing Period",
    "Line Type",
    "Service",
    "Component",
    "Description",
    "Quantity",
    "Rate",
    "Line Amount",
    "Setup Charge (Invoice)",
    "Adjustments Total (Invoice)",
    "Total Billing (Invoice)"
  ];

  const rows = invoices.flatMap((invoice) => {
    const period = invoice.periodStart.toISOString().slice(0, 7);
    const items = invoice.lineItems.length ? invoice.lineItems : [null];
    return items.map((li) => [
      invoice.invoiceNumber,
      invoice.status,
      invoice.customer.customerCode,
      invoice.customer.name,
      period,
      li?.lineType ?? "",
      li?.service ?? "",
      li?.component ?? "",
      li?.description ?? "",
      li?.quantity ?? "",
      li?.rate != null ? Number(li.rate) : "",
      li ? Number(li.amount) : "",
      Number(invoice.setupCharges),
      Number(invoice.adjustmentsTotal),
      Number(invoice.totalAmount)
    ]);
  });

  const csv = toCsv(headers, rows);
  const filename = month ? `billing-export-${month}.csv` : "billing-export.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
