import { z } from "zod";

export const CreateReturnRequestSchema = z.object({
  items: z.array(z.object({
    requestItemId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1),
  notes: z.string().min(1, "Reason for return is required").max(500),
});
