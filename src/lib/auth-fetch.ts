import { getSupabase } from "./supabase";
import { apiUrl } from "./app-routes";

/** fetch() that sends the current Supabase access token as a Bearer header. */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await getSupabase().auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(apiUrl(input), { ...init, headers });
}
