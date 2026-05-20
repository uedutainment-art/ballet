import { z } from "zod";

// Form-level schema. Aliases + tags arrive as comma-separated strings and are
// split at the Firestore boundary (mirrors admission.subjectsCsv pattern).

export const organizationFormSchema = z.object({
  name: z.string().min(1, "이름은 필수예요").max(120),
  shortName: z.string().max(60).optional(),
  englishName: z.string().max(160).optional(),
  aliasesCsv: z.string().optional(),

  type: z.enum([
    "UNIVERSITY",
    "HIGH_SCHOOL",
    "MIDDLE_SCHOOL",
    "ACADEMY",
    "ASSOCIATION",
    "COMPANY",
    "COMPETITION_HOST",
    "PERFORMANCE_HALL",
    "OTHER",
  ]),

  websiteUrl: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//.test(v),
      "URL 형식이 올바르지 않아요",
    ),
  email: z.string().email("이메일 형식이 올바르지 않아요").optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  address: z.string().max(200).optional(),
  region: z.string().max(40).optional(),

  description: z.string().max(2000).optional(),
  establishedYear: z
    .number()
    .int()
    .min(1800)
    .max(2099)
    .optional()
    .or(z.nan().transform(() => undefined)),

  instagramUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  facebookUrl: z.string().optional(),

  tagsCsv: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  notes: z.string().optional(),

  // M11: pull-crawler config. crawlEnabled gates the rest. URLs are optional
  // and validated with a soft `https?://` refine (full URL parsing happens
  // server-side at crawl time).
  crawlEnabled: z.boolean().optional(),
  competitionBoardUrl: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//.test(v),
      "URL은 http:// 또는 https://로 시작해야 해요",
    ),
  admissionBoardUrl: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//.test(v),
      "URL은 http:// 또는 https://로 시작해야 해요",
    ),
  performanceBoardUrl: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^https?:\/\//.test(v),
      "URL은 http:// 또는 https://로 시작해야 해요",
    ),
  excludeUrlPattern: z.string().optional(),
  crawlUserAgent: z.string().optional(),
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
