import { z } from "zod";

// Form-level schema. Dates are ISO yyyy-mm-dd strings (HTML date input).
// Array fields (sections, ageGroups) are comma-separated strings in the UI,
// converted to/from string[] at the Firestore boundary.

export const competitionFormSchema = z
  .object({
    name: z.string().min(1, "대회명은 필수예요").max(120, "대회명은 120자 이하"),
    category: z.enum([
      "domestic_major",
      "domestic_general",
      "intl_korea_round",
      "abroad_admission",
      "regional",
    ]),
    host: z.string().min(1, "주최는 필수예요"),
    // M10: optional org pointer set by OrgCombobox. "" → undefined at write time.
    hostOrgId: z.string().optional(),
    edition: z.string().optional(),
    dateStart: z.string().min(1, "시작일은 필수예요"),
    dateEnd: z.string().min(1, "종료일은 필수예요"),
    registrationStart: z.string().optional(),
    registrationEnd: z.string().min(1, "접수 마감은 필수예요"),
    venue: z.string().min(1, "장소는 필수예요"),
    sectionsCsv: z.string().optional(),
    ageGroupsCsv: z.string().optional(),
    fee: z.string().optional(),
    awards: z.string().optional(),
    officialUrl: z
      .string()
      .min(1, "공식 URL은 필수예요")
      .url("URL 형식이 올바르지 않아요"),
    registerUrl: z
      .string()
      .optional()
      .refine(
        (v) => !v || /^https?:\/\//.test(v),
        "URL 형식이 올바르지 않아요",
      ),
    posterUrl: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((d) => !d.dateEnd || d.dateEnd >= d.dateStart, {
    message: "종료일은 시작일보다 같거나 늦어야 해요",
    path: ["dateEnd"],
  })
  .refine(
    (d) => !d.registrationEnd || !d.dateStart || d.registrationEnd <= d.dateStart,
    {
      message: "접수 마감은 시작일보다 앞이어야 해요",
      path: ["registrationEnd"],
    },
  )
  .refine(
    (d) =>
      !d.registrationStart ||
      !d.registrationEnd ||
      d.registrationStart <= d.registrationEnd,
    {
      message: "접수 시작은 접수 마감보다 앞이어야 해요",
      path: ["registrationStart"],
    },
  );

export type CompetitionFormValues = z.infer<typeof competitionFormSchema>;
