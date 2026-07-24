export const CLOUDINARY_CONFIG = {
  cloudName: 'dhgqr0et2',
  apiKey: '146475928654719',
  uploadPreset: 'hrm_uploads', // You'll need to create this in Cloudinary dashboard
};

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
}

export const uploadToCloudinary = async (
  file: File,
  folder: string = 'hrm'
): Promise<CloudinaryUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
  formData.append('folder', folder);
  // Note: Do NOT add api_key for unsigned uploads

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload failed');
  }

  return response.json();
};

export const getCloudinaryUrl = (publicId: string, options?: { width?: number; height?: number; crop?: string }) => {
  let url = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
  
  if (options) {
    const transforms = [];
    if (options.width) transforms.push(`w_${options.width}`);
    if (options.height) transforms.push(`h_${options.height}`);
    if (options.crop) transforms.push(`c_${options.crop}`);
    if (transforms.length > 0) {
      url += `/${transforms.join(',')}`;
    }
  }
  
  url += `/${publicId}`;
  return url;
};
