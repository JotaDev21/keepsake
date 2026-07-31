import { File } from 'expo-file-system';

import { extFromUri } from '@/lib/media';
import { supabase } from '@/lib/supabase';

export interface MemberProfile {
  id: string;
  displayName: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  updatedAt: number;
  /** Coarse presence only; the UI never exposes an exact clock time. */
  lastSeenAt: number | null;
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function memberAvatarError(uri: string): string | null {
  const file = new File(uri);
  if (!file.exists) return 'foto não encontrada';
  if (file.size > MAX_AVATAR_BYTES) return 'escolha uma foto com até 5 MB';
  return null;
}

function contentType(extension: string): string {
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic' || extension === 'heif') return 'image/heic';
  return 'image/jpeg';
}

export async function uploadMemberAvatar(userId: string, uri: string): Promise<string> {
  if (!supabase) throw new Error('sincronização indisponível');
  const validationError = memberAvatarError(uri);
  if (validationError) throw new Error(validationError);
  const file = new File(uri);

  const extension = extFromUri(uri, 'jpg');
  const path = `${userId}/${Date.now()}.${extension}`;
  const bytes = await file.arrayBuffer();
  const { error } = await supabase.storage.from('avatars').upload(path, bytes, {
    contentType: contentType(extension),
    cacheControl: '604800',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeMemberAvatar(path: string): Promise<void> {
  if (!supabase) return;
  await supabase.storage.from('avatars').remove([path]);
}

export async function signedMemberAvatar(path: string | null): Promise<string | null> {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 7 * 24 * 60 * 60);
  return error ? null : data.signedUrl;
}
