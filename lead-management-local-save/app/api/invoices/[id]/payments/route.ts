import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageBilling } from "@/lib/rbac";
import { paymentSchema } from "@/lib/validators";
import { errorResponse, ApiError } from "@/lib/api-error";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBilling(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const invoice = await prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
    if (!invoice) throw new ApiError("Invoice not found", 404);
    if (invoice.status === "CANCELLED") throw new ApiError("Cannot record a payment on a cancelled invoice", 409);

    const input = paymentSchema.parse(await request.json());

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          invoiceId: id,
          amount: input.amount,
          paidOn: new Date(input.paidOn),
          method: input.method,
          reference: input.reference,
          recordedById: user.id
        }
      });

      const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + input.amount;
      if (totalPaid >= Number(invoice.totalAmount)) {
        await tx.invoice.update({ where: { id }, data: { status: "PAID" } });
      }

      return created;
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
