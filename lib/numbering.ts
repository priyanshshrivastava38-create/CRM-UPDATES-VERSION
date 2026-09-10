import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export async function nextRequestNumber(tx: Tx) {
  const count = await tx.priceApprovalRequest.count();
  return `PAR-${String(count + 1).padStart(6, "0")}`;
}

export async function nextCustomerCode(tx: Tx) {
  const count = await tx.customer.count();
  return `CUST-${String(count + 1).padStart(4, "0")}`;
}

export async function nextInvoiceNumber(tx: Tx, year: number) {
  const count = await tx.invoice.count({ where: { invoiceNumber: { startsWith: `INV-${year}-` } } });
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}
