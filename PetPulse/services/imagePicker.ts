import * as ImagePicker from 'expo-image-picker';

type PickResult = ImagePicker.ImagePickerResult;

export async function pickSingleImageFromLibrary(): Promise<PickResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') return { canceled: true as const, assets: null };

  return ImagePicker.launchImageLibraryAsync({
    // ✅ use the new enum (plural)
    mediaTypes: ['images', 'videos'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
    // allowsMultipleSelection: false, // optional; single-select is default
  });
}

export async function takePhoto(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (perm.status !== 'granted') return { canceled: true as const, assets: null };

  return ImagePicker.launchCameraAsync({
    // ✅ camera also accepts MediaType
    mediaTypes: ['images', 'videos'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
}
