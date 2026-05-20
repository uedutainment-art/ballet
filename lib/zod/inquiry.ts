import { z } from "zod";

// Client-side validation for /contact form. Mirrored by submitInquiry on
// the server (the function never trusts the client alone).

export const inquiryFormSchema = z.object({
  type: z.enum([
    "NEW_CONTENT",
    "EDIT_REQUEST",
    "DELETE_REQUEST",
    "ORG_UPDATE",
    "GENERAL",
  ]),
  subject: z.string().min(2, "제목을 2자 이상 입력해 주세요").max(200),
  message: z
    .string()
    .min(10, "내용을 10자 이상 입력해 주세요")
    .max(3000, "내용은 3000자 이하로 입력해 주세요"),
  email: z
    .string()
    .email("올바른 이메일 형식이 아니에요")
    .optional()
    .or(z.literal("")),
  agreed: z.boolean().refine((v) => v === true, {
    message: "개인정보 처리에 동의해 주세요",
  }),
});

export type InquiryFormValues = z.infer<typeof inquiryFormSchema>;
