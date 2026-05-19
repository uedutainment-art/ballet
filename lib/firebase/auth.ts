import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signOutUser() {
  return signOut(auth);
}

// Maps Firebase Auth error codes to Korean messages shown to the user.
// Keep messages friendly — never leak whether an email is registered.
export function mapAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-credential":
      return "이메일 또는 비밀번호가 올바르지 않아요";
    case "auth/user-not-found":
      return "가입된 계정을 찾을 수 없어요";
    case "auth/wrong-password":
      return "비밀번호가 올바르지 않아요";
    case "auth/too-many-requests":
      return "잠시 후 다시 시도해 주세요";
    case "auth/popup-closed-by-user":
      return "로그인 창이 닫혔어요";
    case "auth/popup-blocked":
      return "팝업이 차단됐어요. 브라우저 설정을 확인해 주세요";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해 주세요";
    default:
      return "로그인에 실패했어요";
  }
}
