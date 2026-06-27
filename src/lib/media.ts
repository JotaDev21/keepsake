import { Directory, File, Paths } from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { token } from './ids';

/**
 * Media lives in the app sandbox (document dir), never leaving the device. We
 * store only the FILENAME in the database and rebuild the absolute uri on read,
 * so the data survives the container path changing between installs/updates.
 */
const MEDIA_DIRNAME = 'media';

function mediaDir(): Directory {
  const dir = new Directory(Paths.document, MEDIA_DIRNAME);
  if (!dir.exists) dir.create({ idempotent: true });
  return dir;
}

/** File extension (no dot) from a uri, or a fallback. */
export function extFromUri(uri: string, fallback: string): string {
  const clean = uri.split('?')[0];
  const match = clean.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : fallback;
}

/** Copy an external (picked/captured) file into the media dir; returns its stored filename. */
export async function saveMedia(sourceUri: string, fallbackExt: string): Promise<string> {
  const dir = mediaDir();
  const filename = `${token()}.${extFromUri(sourceUri, fallbackExt)}`;
  const dest = new File(dir, filename);
  const src = new File(sourceUri);
  await src.copy(dest);
  return filename;
}

/** Absolute uri for a stored media filename. */
export function mediaUri(filename: string): string {
  return new File(new Directory(Paths.document, MEDIA_DIRNAME), filename).uri;
}

/** Delete a stored media file (no-op if missing). */
export function deleteMedia(filename: string): void {
  const file = new File(new Directory(Paths.document, MEDIA_DIRNAME), filename);
  if (file.exists) file.delete();
}

/** Generate a thumbnail from a video and store it; returns its filename (or null). */
export async function generateVideoThumb(videoUri: string): Promise<string | null> {
  try {
    const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 800, quality: 0.7 });
    return await saveMedia(uri, 'jpg');
  } catch {
    return null;
  }
}
