import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => callback(session?.user ?? null),
  );
  return subscription;
}

export async function getProfile(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", userId)
    .single();
  return data?.nickname ?? null;
}

export async function upsertProfile(
  userId: string,
  nickname: string,
): Promise<void> {
  await supabase.from("profiles").upsert({ id: userId, nickname });
}
