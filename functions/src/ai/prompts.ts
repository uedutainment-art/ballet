export const COMPETITION_EXTRACTION_PROMPT = `You are extracting structured data from a Korean ballet competition poster image.

Return STRICT JSON only — no preamble, no markdown fences, no commentary.

Schema (all string fields are nullable unless required):
{
  "name": string,           // required, in source language
  "host": string,           // required (organizer / 주최)
  "edition": string | null, // e.g. "제8회", "8th edition"
  "category": "domestic_major" | "domestic_general" | "intl_korea_round" | "abroad_admission" | "regional",
  "dateStart": string | null,         // YYYY-MM-DD
  "dateEnd": string | null,           // YYYY-MM-DD
  "registrationStart": string | null, // YYYY-MM-DD
  "registrationEnd": string | null,   // YYYY-MM-DD
  "venue": string | null,
  "sections": string[],        // 부문 e.g. ["주니어 클래식", "시니어 컨템포러리"]
  "ageGroups": string[],       // 참가 자격 / 연령
  "fee": string | null,        // 참가비, free-form Korean
  "awards": string | null,     // 시상, free-form
  "officialUrl": string | null,
  "registerUrl": string | null,
  "aiConfidence": number,      // 0.0 - 1.0, overall extraction confidence
  "aiFieldNotes": object       // { fieldName: "한국어 짧은 노트" }
}

Strict rules:
- NEVER guess dates. If unclear or partial, set null and add a Korean note in aiFieldNotes.
- NEVER guess registrationEnd. If not explicitly shown on the poster, leave null.
- Keep Korean content in Korean; keep English in English; do NOT translate.
- Strip promotional language ("최고의!", "역대 최대" 등). Factual content only.
- Category guide:
    domestic_major     국내 대형 (KIBC, TBC, 전국 규모)
    domestic_general   국내 일반
    intl_korea_round   YGP / AGP 등 국제 한국 예선
    abroad_admission   해외 유학·입시 대회
    regional           지역 소규모
  If uncertain, default to "domestic_general".
- aiConfidence:
    0.9+  required fields all clearly visible
    0.6 - 0.8  partial / some ambiguity
    < 0.6  poor poster quality or many guesses
- Add aiFieldNotes ONLY for fields where the value is ambiguous, guessed, or partial.

When ADDITIONAL REFERENCE text is provided after the image, treat the image as primary and the text as supporting evidence — they describe the same event. The text often clarifies dates, fees, and contact info that are too small to read on the poster. Cross-check the two; if they disagree, prefer the text for dates/numbers, the image for visual design / venue / awards.

Output JSON only.`;

export const ADMISSION_EXTRACTION_PROMPT = `You are extracting structured data about a Korean ballet school admission / audition from an image, PDF page, URL page text, or pasted text.

Return STRICT JSON only — no preamble, no markdown fences, no commentary.

Schema:
{
  "schoolName": string,        // required, e.g. "한국예술종합학교"
  "department": string,        // required, e.g. "무용원 발레전공"
  "schoolType": "middle" | "high" | "university" | "grad",
  "year": number,              // academic year, e.g. 2027
  "capacity": number | null,   // 모집인원 (people)
  "regStart": string | null,         // YYYY-MM-DD, 원서 접수 시작
  "regEnd": string | null,           // YYYY-MM-DD, 원서 접수 마감
  "practical1": string | null,       // YYYY-MM-DD, 1차 실기
  "practical2": string | null,       // YYYY-MM-DD, 2차 실기
  "announcementAt": string | null,   // YYYY-MM-DD, 합격자 발표
  "subjects": string[],        // 실기과목 e.g. ["바리에이션", "컨템포러리 즉흥"]
  "csat": "reflected" | "not_reflected" | "reference_only",  // 수능 반영
  "fee": string | null,        // 전형료, free-form Korean (e.g. "₩90,000")
  "guidelineUrl": string | null,
  "officialUrl": string | null,
  "aiConfidence": number,      // 0.0 - 1.0
  "aiFieldNotes": object       // { fieldName: "한국어 짧은 노트" }
}

Strict rules:
- NEVER guess dates. If unclear, set null and add a Korean note in aiFieldNotes.
- NEVER guess regEnd. If not explicitly shown, leave null.
- Keep Korean content in Korean; keep English in English.
- schoolType guide:
    middle      예술중 (e.g. 선화예중, 예원학교)
    high        예술고 (e.g. 서울예고)
    university  학사 학위 과정
    grad        석사·박사·예술전문사 (e.g. 한예종 예술전문사)
- csat guide:
    reflected         수능 성적이 입시 결과에 직접 반영됨
    not_reflected     수능 미반영 (실기 100% 등)
    reference_only    참고용으로만 본다고 명시
  If uncertain, prefer "not_reflected" for 중/고, "reference_only" for 대학.
- year: extract the academic year as a 4-digit integer (e.g. 2027). If only "2027학년도" is shown, return 2027.
- aiConfidence:
    0.9+   most required fields clearly visible
    0.6-0.8 partial / some ambiguity
    < 0.6  poor source quality

Output JSON only.`;
