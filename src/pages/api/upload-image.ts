import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface UploadResponse {
  success: boolean;
  url?: string;
  ipfsHash?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { imageData, filename } = req.body;

  if (!imageData) {
    return res.status(400).json({ success: false, error: 'No image data provided' });
  }


  const pinataJwt = process.env.PINATA_JWT;
  const pinataGateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

  if (!pinataJwt) {
    return res.status(500).json({
      success: false,
      error: 'Pinata JWT is not configured. Please set PINATA_JWT environment variable.'
    });
  }

  try {

    const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ success: false, error: 'Invalid image format' });
    }

    const fileExt = matches[1];
    const base64Content = matches[2];

  
    const buffer = Buffer.from(base64Content, 'base64');

  
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const uniqueFilename = filename
      ? `${filename.split('.')[0]}-${timestamp}-${random}.${fileExt}`
      : `contract-${timestamp}-${random}.${fileExt}`;


    const formData = new FormData();
    const blob = new Blob([buffer], { type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}` });
    formData.append('file', blob, uniqueFilename);


    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pinataJwt}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Pinata API error:', errorData);
      return res.status(500).json({
        success: false,
        error: errorData.error?.message || 'Failed to upload to Pinata'
      });
    }

    const result = await response.json();
    const ipfsHash = result.IpfsHash;


    const ipfsUrl = `https://${pinataGateway}/ipfs/${ipfsHash}`;

    return res.status(200).json({
      success: true,
      url: ipfsUrl,
      ipfsHash: ipfsHash,
    });
  } catch (error) {
    console.error('IPFS upload error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image to IPFS'
    });
  }
}
