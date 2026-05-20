import { z } from "zod";

const optionalNumber = z
  .number()
  .int()
  .nonnegative()
  .optional()
  .or(z.nan().transform(() => undefined));

export const performanceFormSchema = z
  .object({
    title: z.string().min(1, "공연명은 필수예요").max(140),
    company: z.string().min(1, "단체명은 필수예요"),
    // M10: optional org pointers set by OrgCombobox.
    companyOrgId: z.string().optional(),
    venueOrgId: z.string().optional(),
    companyType: z
      .enum(["national", "private", "university", "foreign", "other"])
      .optional(),
    venue: z.string().min(1, "장소는 필수예요"),
    dateStart: z.string().min(1, "시작일은 필수예요"),
    dateEnd: z.string().min(1, "종료일은 필수예요"),
    showtimesCsv: z.string().optional(),
    ticketPriceMin: optionalNumber,
    ticketPriceMax: optionalNumber,
    ticketUrl: z
      .string()
      .optional()
      .refine(
        (v) => !v || /^https?:\/\//.test(v),
        "URL 형식이 올바르지 않아요",
      ),
    description: z.string().max(500).optional(),
    choreographer: z.string().optional(),
    composer: z.string().optional(),
    runtime: optionalNumber,
    ageLimit: z.string().optional(),
    posterUrl: z.string().optional(),
    officialUrl: z
      .string()
      .min(1, "공식 URL은 필수예요")
      .url("URL 형식이 올바르지 않아요"),
    notes: z.string().optional(),
  })
  .refine((d) => !d.dateEnd || d.dateEnd >= d.dateStart, {
    message: "종료일은 시작일보다 같거나 늦어야 해요",
    path: ["dateEnd"],
  })
  .refine(
    (d) =>
      d.ticketPriceMin === undefined ||
      d.ticketPriceMax === undefined ||
      d.ticketPriceMax >= d.ticketPriceMin,
    {
      message: "최고가는 최저가보다 같거나 높아야 해요",
      path: ["ticketPriceMax"],
    },
  );

export type PerformanceFormValues = z.infer<typeof performanceFormSchema>;
