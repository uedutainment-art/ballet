import type { Timestamp } from "firebase/firestore";

// Admin/editor accounts only. Public visitors are anonymous and have no
// /users document. A MEMBER tier may land later but is not in scope here.

export type UserRole = "EDITOR" | "ADMIN" | "SUPER_ADMIN";

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: Timestamp;
}

export function isEditorOrAbove(role: UserRole | undefined | null): boolean {
  return role === "EDITOR" || role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isAdminOrAbove(role: UserRole | undefined | null): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isSuperAdmin(role: UserRole | undefined | null): boolean {
  return role === "SUPER_ADMIN";
}
