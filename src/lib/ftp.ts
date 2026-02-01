/**
 * FTP Upload Configuration
 * Configure these values based on your FTP hosting provider
 */
export const FTP_CONFIG = {
  host: process.env.FTP_HOST || '',
  user: process.env.FTP_USER || '',
  password: process.env.FTP_PASSWORD || '',
  port: parseInt(process.env.FTP_PORT || '21'),
  // The public URL base where uploaded files will be accessible
  publicUrlBase: process.env.FTP_PUBLIC_URL || '',
  // The remote directory to upload files to
  remoteDir: process.env.FTP_REMOTE_DIR || '/public_html/uploads/contracts',
};

/**
 * Generate a unique filename for uploaded images
 */
export const generateUniqueFilename = (originalFilename: string): string => {
  const ext = originalFilename.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `contract-${timestamp}-${random}.${ext}`;
};

/**
 * Get the public URL for an uploaded file
 */
export const getPublicUrl = (filename: string): string => {
  const baseUrl = FTP_CONFIG.publicUrlBase.replace(/\/$/, '');
  return `${baseUrl}/${filename}`;
};
