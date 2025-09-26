import { useState } from 'react';
import axios from 'axios';

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file type - support images, videos, and audio (allow HEIC/HEIF by filename)
    const validTypes = ['image/', 'video/', 'audio/'];
    const isValidType = validTypes.some(type => (file.type || '').startsWith(type));
    const isHeicByName = /\.(heic|heif)$/i.test(file.name || '');
    if (!isValidType && !isHeicByName) {
      return 'Please select an image, video, or audio file';
    }

    // Check file size (10MB limit for media files)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return 'File size must be less than 20MB';
    }

    return null;
  };

  // Removed unused functions: fileToBase64, base64ToBlob, getFileExtension

  const uploadFile = async (file: File, store?: string): Promise<string | null> => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return null;
    }

    try {
      setUploading(true);
      setError(null);
      setUploadProgress(25);

      const formData = new FormData();
      formData.append('file[]', file);
      formData.append('get_other_dimensions', 'false');
      formData.append('convert_format', 'webp');
      formData.append('access_control', 'cdn');
      if (store && store.trim() !== '') {
        formData.append('store', store);
      }
      setUploadProgress(50);

      const auraApiConfig = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://auraprod.unthink.ai/cs/img/',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };

      const auraResponse = await axios.request(auraApiConfig);
      const mediaUrl = auraResponse.data?.data?.[0]?.url;

      if (!mediaUrl) {
        throw new Error('No media URL returned from server');
      }

      setUploadProgress(100);
      console.log('Media uploaded successfully:', mediaUrl);
      return mediaUrl;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      console.error('File upload error:', err);
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const resetUpload = () => {
    setError(null);
    setUploadProgress(0);
    setUploading(false);
    setBase64Image(null);
  };

  return {
    uploadFile,
    uploading,
    uploadProgress,
    error,
    resetUpload,
    validateFile,
    base64Image
  };
};