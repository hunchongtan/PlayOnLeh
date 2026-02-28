export const ALLOWED_CHAT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_CHAT_IMAGE_SIZE = 8 * 1024 * 1024;

export function validateChatImageFile(file: File): string | null {
  if (!ALLOWED_CHAT_IMAGE_TYPES.has(file.type)) {
    return "Unsupported image type. Use JPG, PNG, or WEBP.";
  }
  if (file.size > MAX_CHAT_IMAGE_SIZE) {
    return "Image is too large. Max size is 8MB.";
  }
  return null;
}
