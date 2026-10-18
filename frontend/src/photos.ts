import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const PHOTO_DIR = `${FileSystem.documentDirectory ?? ""}zelador_photos/`;

async function ensureDir() {
  if (Platform.OS === "web") return;
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

async function persistUri(uri: string): Promise<string> {
  if (Platform.OS === "web") return uri;
  await ensureDir();
  const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dest = `${PHOTO_DIR}${name}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

export async function pickFromGallery(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.75,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  return persistUri(res.assets[0].uri);
}

export async function pickFromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({
    quality: 0.75,
    allowsEditing: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  return persistUri(res.assets[0].uri);
}
