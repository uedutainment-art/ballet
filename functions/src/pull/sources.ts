export type PullSourceType = "competition" | "admission";

export interface PullSource {
  id: string;
  name: string;
  url: string;
  type: PullSourceType;
  // Optional CSS selector for a list region. If absent, the crawler extracts
  // the whole body text.
  listSelector?: string;
}

export const SOURCES: PullSource[] = [
  {
    id: "kibc",
    name: "코리아국제발레콩쿠르",
    url: "https://www.koreaballet.com",
    type: "competition",
  },
  {
    id: "kba",
    name: "한국발레협회",
    url: "http://www.koreaballet.or.kr",
    type: "competition",
  },
  {
    id: "ygp-korea",
    name: "YGP Korea",
    url: "https://yagp.org",
    type: "competition",
  },
  {
    id: "karts",
    name: "한예종 무용원",
    url: "https://www.karts.ac.kr/main/appl.do",
    type: "admission",
  },
  {
    id: "sunhwa",
    name: "선화예술중",
    url: "https://www.sunhwaarts.ms.kr",
    type: "admission",
  },
];
