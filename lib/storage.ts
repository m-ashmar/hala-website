import { put, del } from '@vercel/blob';
import { logger } from './logger';

export async function uploadFile(file: File, prefix = 'uploads') {
  try {
    const blob = await put(`${prefix}/${Date.now()}-${file.name}`, file, {
      access: 'public',
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
