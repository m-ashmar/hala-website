import { put, del } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { logger } from './logger';

/**
 * Extension to use for each accepted image type.
 *
 * The stored name is derived from the validated MIME type rather than from the
 * uploaded filename, because the filename is attacker-controlled and decides
 * how the blob is later served.
 */
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export async function uploadFile(file: File, prefix = 'uploads') {
  // The previous path was `${prefix}/${Date.now()}-${file.name}`, embedding the
  // client-supplied filename directly. Two problems came with it:
  //
  //   - traversal: a name like "../../something" escapes the prefix;
  //   - extension control: uploading "payload.html" stores a .html object on a
  //     public blob domain, which is stored XSS — and callers only validate
  //     file.type, which the client also controls, so the two never had to
  //     agree.
  //
  // The name is now generated server-side and the extension comes from the
  // validated MIME type, so neither is influenced by the upload.
  const extension = EXTENSION_BY_MIME[file.type];
  if (!extension) {
    // Callers validate MIME before reaching here; this is the backstop for a
    // path that forgets to.
    throw new Error(`Unsupported upload type: ${file.type}`);
  }

  const safeName = `${prefix}/${Date.now()}-${randomUUID()}.${extension}`;

  try {
    const blob = await put(safeName, file, {
      access: 'public',
      // Pin the served content type rather than letting it be inferred.
      contentType: file.type,
    });
    return blob.url;
  } catch (error) {
    logger.error({ error }, 'Failed to upload file to Blob storage');
    throw new Error('Failed to upload file');
  }
}

export async function deleteFile(url: string) {
  try {
    await del(url);
  } catch (error) {
    logger.error({ error, url }, 'Failed to delete file from Blob storage');
    throw new Error('Failed to delete file');
  }
}
