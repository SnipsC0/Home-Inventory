import type { ApiService } from '../services/api';
import type { UploadContext } from '../types';
import type { ImagePickerValue } from '../components/Modal/ImagePickerField';

/**
 * Turn an ImagePickerField value into the `image` field for an add/update call:
 * a new upload path, '' to clear the image, or undefined to leave it unchanged.
 */
export async function resolveImageField(
  api: ApiService,
  image: ImagePickerValue | undefined,
  context: UploadContext
): Promise<string | undefined> {
  if (image?.file) {
    // uploadImage already alerts on failure; keep the current image then
    const uploaded = await api.uploadImage(image.file, context);
    if (!uploaded) return undefined;
    return typeof uploaded === 'string' ? uploaded : uploaded.path;
  }
  if (image?.removed) return '';
  return undefined;
}
