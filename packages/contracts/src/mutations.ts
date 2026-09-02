import { z } from "zod";

export const WhatIfMutationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("BLOCK_ROAD"), roadSegmentId: z.string().min(1) }),
  z.object({ kind: z.literal("DEGRADE_ROAD"), roadSegmentId: z.string().min(1) }),
  z.object({ kind: z.literal("REOPEN_ROAD"), roadSegmentId: z.string().min(1) }),
  z.object({
    kind: z.literal("FAIL_INFRASTRUCTURE"),
    infrastructureAssetId: z.string().min(1),
  }),
]);

export type WhatIfMutation = z.infer<typeof WhatIfMutationSchema>;
