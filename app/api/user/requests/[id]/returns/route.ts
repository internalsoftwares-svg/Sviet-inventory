/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { prisma } from "@/lib/db/prisma";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getRequestUser } from "@/lib/api/session";
import { UnauthorizedError, ValidationError, NotFoundError, ConflictCodeError } from "@/lib/errors";
import { CreateReturnRequestSchema } from "@/lib/validation/returns";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser();
    if (!user) return apiError(new UnauthorizedError());

    const { id: requestId } = await params;
    
    const body = await req.json();
    const parsed = CreateReturnRequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(new ValidationError("Invalid payload.", parsed.error.flatten()));
    }
    
    const originalRequest = await prisma.request.findUnique({
      where: { id: requestId, userId: user.id },
      include: { items: true },
    });

    if (!originalRequest) return apiError(new NotFoundError("Request not found."));
    if (originalRequest.status !== "APPROVED") {
      return apiError(new ConflictCodeError("INVALID_STATUS", "Only approved requests can be returned."));
    }

    const { items, notes } = parsed.data;

    // Validate items
    for (const item of items) {
      const reqItem = originalRequest.items.find(ri => ri.id === item.requestItemId);
      if (!reqItem) {
        return apiError(new ValidationError(`Item ${item.requestItemId} does not belong to this request.`));
      }
      
      // Calculate how many were returned already (PENDING or APPROVED)
      const previousReturns = await prisma.returnRequestItem.aggregate({
        where: { 
          requestItemId: reqItem.id,
          returnRequest: { status: { not: "REJECTED" } }
        },
        _sum: { quantity: true }
      });
      const alreadyReturned = previousReturns._sum.quantity || 0;
      const maxReturnable = (reqItem.quantityFul || 0) - alreadyReturned;

      if (item.quantity > maxReturnable) {
        return apiError(new ValidationError(`Cannot return more than fulfilled quantity for item. Max available to return: ${maxReturnable}`));
      }
    }

    const returnRequest = await prisma.$transaction(async (tx) => {
      const rr = await tx.returnRequest.create({
        data: {
          requestId,
          userId: user.id,
          notes,
          status: "REQUESTED",
        }
      });

      await tx.returnRequestItem.createMany({
        data: items.map(i => ({
          returnRequestId: rr.id,
          requestItemId: i.requestItemId,
          itemId: originalRequest.items.find(ri => ri.id === i.requestItemId)!.itemId,
          quantity: i.quantity,
        }))
      });

      return rr;
    });
    return apiSuccess(returnRequest);
  } catch (error: any) {
    console.error("[RETURN_REQUEST_CREATE]", error);
    return NextResponse.json({ success: false, error: { message: "Internal server error" } }, { status: 500 });
  }
}
