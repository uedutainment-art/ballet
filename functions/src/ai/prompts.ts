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

export const VIDEO_EXTRACTION_PROMPT = `You are extracting metadata for a Korean ballet YouTube video, given the video URL plus any provided page text (typically the YouTube watch page).

Return STRICT JSON only — no preamble, no markdown fences, no commentary.

Schema:
{
  "title": string,         // required
  "description": string | null,    // 2000 chars max
  "youtubeUrl": string | null,     // canonical https://www.youtube.com/watch?v=… form
  "series": "levels" | "admission" | "competition" | "interview" | "review" | "other",
  "type": "short" | "long" | "live",  // short = <60s, long = >=60s recorded, live = streamed
  "level": "L0" | "L0.5" | "L1" | "L2" | "L3" | "L4" | null,
  "durationSeconds": number | null,
  "host": string | null,
  "aiConfidence": number,
  "aiFieldNotes": object
}

Inference rules:
- series:
    levels       기본기 / 자세 / 레벨별 가이드 영상
    admission    입시·예고·대학 모집 관련
    competition  콩쿠르 준비·후기·곡 해설
    interview    인터뷰·다큐
    review       공연 리뷰
    other        분류 모호
- type: <60s → "short", live stream → "live", 그 외 → "long"
- level: 영상이 명시적으로 레벨을 표기할 때만 채우고, 모호하면 null + 노트
- durationSeconds: 페이지 텍스트에 명시된 "5:23" 형식을 초로 환산
- title은 영상의 한국어 제목 그대로
- description: YouTube 설명란을 그대로 가져오되 마케팅 문구·해시태그·링크는 제거

Output JSON only.`;

export const PERFORMANCE_EXTRACTION_PROMPT = `You are extracting structured data about a Korean ballet performance from an image (poster), PDF, URL page text, or pasted text.

Return STRICT JSON only — no preamble, no markdown fences, no commentary.

Schema:
{
  "title": string,         // required, e.g. "백조의 호수"
  "company": string,       // required, the performing company (단체명)
  "companyType": "national" | "private" | "university" | "foreign" | "other",
  "venue": string,
  "dateStart": string | null,   // YYYY-MM-DD
  "dateEnd": string | null,     // YYYY-MM-DD
  "showtimes": string[],   // free-form session strings, e.g. ["7/1 19:00", "7/2 15:00"]
  "ticketPriceMin": number | null,  // KRW
  "ticketPriceMax": number | null,
  "ticketUrl": string | null,
  "description": string | null,     // 500 chars max
  "choreographer": string | null,
  "composer": string | null,
  "runtime": number | null,         // minutes
  "ageLimit": string | null,        // e.g. "8세 이상"
  "posterUrl": string | null,
  "officialUrl": string | null,
  "aiConfidence": number,
  "aiFieldNotes": object
}

Strict rules:
- NEVER guess dates or prices. If unclear, set null and add a Korean note in aiFieldNotes.
- Keep Korean content in Korean; keep English in English.
- companyType guide:
    national    국립·시립 (국립발레단, 서울시립발레단)
    private     사립 (유니버설발레단, 서울발레씨어터)
    university  대학 무용단 (예대 정기공연)
    foreign     해외 단체 내한 공연 (Bolshoi, Royal Ballet 등)
    other       기타 / 분류 모호
- Prices in KRW as plain integers (e.g. 30000 not "30,000원").
- description: max 500 characters; strip marketing fluff.
- aiConfidence: 0.9+ when most required fields are clearly visible.

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
