"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { SITE_URL, TERMS_VERSION } from "@/lib/site";
import { IS_APP_BUNDLE, webPath } from "@/lib/app-routes";
import { isNativeApp } from "@/lib/native";

const termsAcceptance = () => ({
  terms_accepted_version: TERMS_VERSION,
  terms_accepted_at: new Date().toISOString(),
  age_confirmed: true,
});

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, next?: string) => Promise<{ error?: string; needsConfirmation?: boolean }>;
  signInWithGoogle: (next?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  updateEmail: (email: string) => Promise<{ error?: string; changed?: boolean }>;
  acceptTerms: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signInWithGoogle: async () => ({}),
  signOut: async () => {},
  resetPassword: async () => ({}),
  updatePassword: async () => ({}),
  updateEmail: async () => ({}),
  acceptTerms: async () => ({}),
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message };
  };

  const signUp = async (email: string, password: string, next = "/dashboard") => {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${SITE_URL}${webPath(next)}`, data: termsAcceptance() },
    });
    return { error: error?.message, needsConfirmation: !error && !data.session };
  };

  // Google blocks sign-in inside app webviews, so the apps open the system browser; the
  // https://tvtime.online link it returns to opens the app again (NativeBridge sets the session).
  const signInWithGoogle = async (next = "/dashboard") => {
    const base = IS_APP_BUNDLE || isNativeApp() ? SITE_URL : window.location.origin;
    const redirectTo = `${base}${IS_APP_BUNDLE ? webPath(next) : next}`;
    if (!isNativeApp()) {
      const { error } = await getSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      return { error: error?.message };
    }
    const { data, error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return { error: error?.message || "Couldn't start Google sign-in" };
    const { AppLauncher } = await import("@capacitor/app-launcher");
    await AppLauncher.openUrl({ url: data.url });
    return {};
  };

  const acceptTerms = async () => {
    const { data, error } = await getSupabase().auth.updateUser({ data: termsAcceptance() });
    if (data?.user) setUser(data.user);
    return { error: error?.message };
  };

  const signOut = async () => {
    await getSupabase().auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/update-password`,
    });
    return { error: error?.message };
  };

  const updatePassword = async (password: string) => {
    const { error } = await getSupabase().auth.updateUser({ password });
    return { error: error?.message };
  };

  // Same user id either way, so all data stays. With "Confirm email" off in Supabase it applies immediately;
  // otherwise Supabase emails confirmation links first.
  const updateEmail = async (email: string) => {
    const { data, error } = await getSupabase().auth.updateUser({ email }, { emailRedirectTo: `${SITE_URL}/profile` });
    if (data?.user) setUser(data.user);
    return { error: error?.message, changed: data?.user?.email?.toLowerCase() === email.toLowerCase() };
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signInWithGoogle, signOut, resetPassword, updatePassword, updateEmail, acceptTerms }}
    >
      {children}
    </AuthContext.Provider>
  );
}
