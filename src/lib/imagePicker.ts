import * as ImagePicker from 'expo-image-picker';

/** Pick a single image (for cover/avatar). Returns the uri or null if cancelled. */
export async function pickImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.9,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets.length) return null;
  return result.assets[0].uri;
}

/** Pick a restrained square portrait for the private couple identity. */
export async function pickIdentityAvatar(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.65,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets.length) return null;
  return result.assets[0].uri;
}

export interface PickedMedia {
  uri: string;
  kind: 'foto' | 'video';
}

/** Pick several memories in one native gallery pass. Kept deliberately capped. */
export async function pickMediaMany(): Promise<PickedMedia[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.88,
    allowsMultipleSelection: true,
    selectionLimit: 30,
    orderedSelection: true,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    uri: asset.uri,
    kind: asset.type === 'video' ? 'video' : 'foto',
  }));
}

/** Pick a photo or video from the library (for the Cofre). */
export async function pickMedia(): Promise<PickedMedia | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.9,
  });
  if (result.canceled || !result.assets.length) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, kind: asset.type === 'video' ? 'video' : 'foto' };
}

/** Capture a photo with the camera. Returns the uri or null. */
export async function takePhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (result.canceled || !result.assets.length) return null;
  return result.assets[0].uri;
}
