"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  onAuthChange,
  signInWithEmail as signInImpl,
  signInWithGoogle as signInGoogleImpl,
  signOutUser as signOutImpl,
} from "@/lib/firebase/auth";
import type { UserDoc } from "@/lib/types/user";

type AuthCtx = {
  user: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUserDoc({ ...(data as Omit<UserDoc, "uid">), uid: u.uid });
          } else {
            // Auth account exists but no /users/{uid} doc yet.
            // The guard treats this as "no role" → redirect to /403.
            setUserDoc(null);
          }
        } catch (err) {
          console.error("[AuthProvider] failed to load userDoc:", err);
          setUserDoc(null);
        }
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInImpl(email, password);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInGoogleImpl();
  }, []);

  const signOut = useCallback(async () => {
    await signOutImpl();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, userDoc, loading, signIn, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
