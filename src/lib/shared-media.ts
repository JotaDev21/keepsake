import { File } from 'expo-file-system';

import { extFromUri, mediaUri } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import type { MediaItem, MediaType } from '@/types/models';

export interface SharedMediaItem {
  id: string;
  authorId: string;
  tipo: MediaType;
  fileUrl: string;
  thumbUrl: string | null;
  legenda: string | null;
  dataMemoria: number | null;
  local: string | null;
  criadoEm: number;
}

interface SharedMediaRow {
  id: string;
  author_id: string;
  tipo: MediaType;
  storage_path: string;
  thumb_path: string | null;
  legenda: string | null;
  data_memoria: number | null;
  local: string | null;
  created_at: string;
}

const BUCKET = 'shared-media';
const MAX_BYTES = 45 * 1024 * 1024;
const URL_TTL_SECONDS = 7 * 24 * 60 * 60;

function mimeFor(tipo: MediaType, extension: string): string {
  const ext = extension.toLowerCase();
  if (tipo === 'foto') {
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'heic' || ext === 'heif') return 'image/heic';
    return 'image/jpeg';
  }
  if (tipo === 'video') return ext === 'mov' ? 'video/quicktime' : 'video/mp4';
  if (ext === 'aac') return 'audio/aac';
  return 'audio/mp4';
}

export function sharedMediaError(item: MediaItem): string | null {
  const file = new File(mediaUri(item.file));
  if (!file.exists) return 'Esse arquivo não está mais no aparelho.';
  if (file.size > MAX_BYTES) return 'Por enquanto, compartilhe arquivos de até 45 MB.';
  return null;
}

export async function uploadSharedMedia(
  userId: string,
  coupleId: string,
  remoteId: string,
  item: MediaItem,
): Promise<void> {
  if (!supabase) throw new Error('Sincronização indisponível.');
  const validation = sharedMediaError(item);
  if (validation) throw new Error(validation);

  const sourceUri = mediaUri(item.file);
  const extension = extFromUri(sourceUri, item.tipo === 'foto' ? 'jpg' : item.tipo === 'video' ? 'mp4' : 'm4a');
  const storagePath = `${userId}/${remoteId}/original.${extension}`;
  let thumbPath: string | null = null;

  const file = new File(sourceUri);
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(
    storagePath,
    await file.arrayBuffer(),
    {
      contentType: mimeFor(item.tipo, extension),
      cacheControl: '604800',
      upsert: true,
    },
  );
  if (uploadError) throw uploadError;

  try {
    if (item.thumbFile) {
      const thumbUri = mediaUri(item.thumbFile);
      const thumb = new File(thumbUri);
      if (thumb.exists) {
        const thumbExtension = extFromUri(thumbUri, 'jpg');
        thumbPath = `${userId}/${remoteId}/thumb.${thumbExtension}`;
        const { error } = await supabase.storage.from(BUCKET).upload(
          thumbPath,
          await thumb.arrayBuffer(),
          {
            contentType: mimeFor('foto', thumbExtension),
            cacheControl: '604800',
            upsert: true,
          },
        );
        if (error) throw error;
      }
    }

    const { error } = await supabase.from('shared_media').upsert({
      id: remoteId,
      couple_id: coupleId,
      author_id: userId,
      tipo: item.tipo,
      storage_path: storagePath,
      thumb_path: thumbPath,
      legenda: item.legenda,
      data_memoria: item.dataMemoria,
      local: item.local,
    });
    if (error) throw error;
  } catch (error) {
    await supabase.storage.from(BUCKET).remove([storagePath, ...(thumbPath ? [thumbPath] : [])]);
    throw error;
  }
}

export async function removeSharedMedia(remoteId: string): Promise<void> {
  if (!supabase) throw new Error('Sincronização indisponível.');
  const { data, error } = await supabase
    .from('shared_media')
    .select('storage_path,thumb_path')
    .eq('id', remoteId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const paths = [data.storage_path as string, data.thumb_path as string | null].filter(
    (path): path is string => Boolean(path),
  );
  // Hide the row first so a storage hiccup can never leave a broken item in
  // the partner's gallery. Orphan cleanup is safe to retry independently.
  const { error: deleteError } = await supabase.from('shared_media').delete().eq('id', remoteId);
  if (deleteError) throw deleteError;
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
    if (storageError) console.warn('memory ev: limpeza remota de mídia pendente', storageError);
  }
}

export async function listSharedMedia(coupleId: string): Promise<SharedMediaItem[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('shared_media')
    .select('id,author_id,tipo,storage_path,thumb_path,legenda,data_memoria,local,created_at')
    .eq('couple_id', coupleId)
    .order('created_at', { ascending: false });
  if (error || !data) return null;

  const rows = data as SharedMediaRow[];
  const paths = [...new Set(rows.flatMap((row) => [row.storage_path, row.thumb_path]).filter(
    (path): path is string => Boolean(path),
  ))];
  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, URL_TTL_SECONDS);
  if (signedError || !signed) return null;
  const urls = new Map(
    signed
      .filter((entry) => entry.path && entry.signedUrl)
      .map((entry) => [entry.path as string, entry.signedUrl as string]),
  );
  return rows.flatMap((row): SharedMediaItem[] => {
    const fileUrl = urls.get(row.storage_path);
    if (!fileUrl) return [];
    return [{
      id: row.id,
      authorId: row.author_id,
      tipo: row.tipo,
      fileUrl,
      thumbUrl: row.thumb_path ? (urls.get(row.thumb_path) ?? null) : null,
      legenda: row.legenda,
      dataMemoria: row.data_memoria,
      local: row.local,
      criadoEm: Date.parse(row.created_at) || Date.now(),
    }];
  });
}
