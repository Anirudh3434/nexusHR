// Cloudinary Unsigned Upload (no server needed)
const CLOUDINARY_CLOUD_NAME = 'dhgqr0et2';
const UPLOAD_PRESET = 'hrm_uploads';

export interface UploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

export const uploadImage = async (file: File, folder?: string): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  
  // Only add folder if provided - some presets may not support folder parameter
  if (folder) {
    formData.append('folder', folder);
  }
  
  // Debug: log formData entries
  const entries: string[] = [];
  formData.forEach((value, key) => entries.push(`${key}=${key === 'file' ? '[File]' : value}`));
  console.log('FormData entries:', entries.join(', '));

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  console.log('Uploading to:', uploadUrl);
  
  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Cloudinary error:', error);
    throw new Error(error.error?.message || error.message || 'Upload failed');
  }

  return response.json();
};
