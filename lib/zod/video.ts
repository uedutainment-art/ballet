import { z } from "zod";
import { extractYoutubeId } from "@/lib/utils/youtube";

const optionalNumber = z
  .number()
  .int()
  .nonnegative()
  .optional()
  .or(z.nan().transform(() => undefined));

// Allow "" as a placeholder for "no level selected" so the <select> empty
// option type-checks. formToPatch strips empty strings before write.
const optionalLevel = z
  .enum(["", "L0", "L0.5", "L1", "L2", "L3", "L4"])
  .optional();

export const videoFormSchema = z.object({
  title: z.string().min(1, "제목은 필수예요").max(120),
  description: z.string().max(2000).optional(),
  youtubeUrl: z
    .string()
    .min(1, "YouTube URL은 필수예요")
    .refine(
      (v) => extractYoutubeId(v) !== null,
      "유효한 YouTube URL 또는 11자 ID여야 해요",
    ),
  series: z.enum([
    "levels",
    "admission",
    "competition",
    "interview",
    "review",
    "other",
  ]),
  type: z.enum(["short", "long", "live"]),
  level: optionalLevel,
  durationSeconds: optionalNumber,
  host: z.string().optional(),
  relatedCompetitionIdsCsv: z.string().optional(),
  relatedAdmissionIdsCsv: z.string().optional(),
  relatedPerformanceIdsCsv: z.string().optional(),
  // M10: multi-org CSV (orgIds).
  relatedOrgIdsCsv: z.string().optional(),
  notes: z.string().optional(),
});

export type VideoFormValues = z.infer<typeof videoFormSchema>;
