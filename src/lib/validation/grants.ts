import { z } from "zod";

export const grantCreateSchema = z.object({
  name: z.string().min(3),
  status: z.enum([
    "PIPELINE",
    "DRAFT",
    "SUBMITTED",
    "AWARDED",
    "REPORTING",
    "CLOSED",
  ]),
  amount: z.number().finite(),
  awardAmount: z.number().finite().optional(),
  applicationDeadline: z.string().optional(),
});
