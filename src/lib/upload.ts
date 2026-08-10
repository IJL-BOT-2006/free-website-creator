import { supabase } from "@/integrations/supabase/client";

export async function uploadMedia(file: File, folder: string) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id ?? "anon";
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${folder}/${uid}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedUrl(path: string) {
  const { data, error } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function openMedia(path: string) {
  const url = await signedUrl(path);
  window.open(url, "_blank", "noopener");
}
