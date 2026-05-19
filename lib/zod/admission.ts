import { z } from "zod";

// Form-level schema. Dates are ISO yyyy-mm-dd; subjects + bonusCompetitions
// are comma-separated strings converted at the Firestore boundary.

export const admissionFormSchema = z
  .object({
    schoolName: z
      .string()
      .min(1, "학교명은 필수예요")
      .max(120, "학교명은 120자 이하"),
    department: z.string().min(1, "학과는 필수예요"),
    schoolType: z.enum(["middle", "high", "university", "grad"]),
    year: z.number().int().min(2024).max(2099),
    capacity: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .or(z.nan().transform(() => undefined)),
    regStart: z.string().optional(),
    regEnd: z.string().optional(),
    practical1: z.string().optional(),
    practical2: z.string().optional(),
    announcementAt: z.string().optional(),
    subjectsCsv: z.string().optional(),
    csat: z.enum(["reflected", "not_reflected", "reference_only"]),
    fee: z.string().optional(),
    guidelineUrl: z
      .string()
      .optional()
      .refine(
        (v) => !v || /^https?:\/\//.test(v),
        "URL 형식이 올바르지 않아요",
      ),
    officialUrl: z
      .string()
      .min(1, "공식 URL은 필수예요")
      .url("URL 형식이 올바르지 않아요"),
    bonusCompetitionsCsv: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (d) => !d.regStart || !d.regEnd || d.regStart <= d.regEnd,
    {
      message: "원서 접수 시작은 마감보다 앞이어야 해요",
      path: ["regStart"],
    },
  )
  .refine(
    (d) => !d.practical1 || !d.practical2 || d.practical1 <= d.practical2,
    {
      message: "1차 실기는 2차 실기보다 앞이어야 해요",
      path: ["practical1"],
    },
  );

export type AdmissionFormValues = z.infer<typeof admissionFormSchema>;
