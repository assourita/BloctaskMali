/**
 * Compression d'images compatible Expo Go.
 * `expo-image-manipulator` n'est pas toujours lié en Expo Go Android :
 * on tente, sinon on renvoie l'URI d'origine (ImagePicker compresse déjà via quality).
 */
export async function compressImageUri(uri: string, maxWidth = 1024): Promise<string> {
  try {
    const ImageManipulator = await import('expo-image-manipulator');
    if (typeof ImageManipulator.manipulateAsync !== 'function') {
      return uri;
    }
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );
    return result.uri;
  } catch {
    return uri;
  }
}
