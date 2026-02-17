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

// Find or create a Pinata group by name
async function getOrCreateGroup(groupName: string, pinataJwt: string): Promise<string> {
  // List groups filtered by name
  const listRes = await fetch(
    `https://api.pinata.cloud/v3/groups/public?name=${encodeURIComponent(groupName)}&limit=1`,
    {
      headers: { 'Authorization': `Bearer ${pinataJwt}` },
    }
  );

  if (listRes.ok) {
    const listData = await listRes.json();
    const existingGroup = listData.data?.groups?.find(
      (g: any) => g.name === groupName
    );
    if (existingGroup) {
      return existingGroup.id;
    }
  }

  // Create new group
  const createRes = await fetch('https://api.pinata.cloud/v3/groups/public', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${pinataJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: groupName }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json();
    throw new Error(errData.error?.message || 'Failed to create Pinata group');
  }

  const createData = await createRes.json();
  return createData.data.id;
}

// Count existing files in a group to determine version number
async function getNextVersion(groupId: string, pinataJwt: string): Promise<number> {
  const listRes = await fetch(
    `https://api.pinata.cloud/data/pinList?groupId=${groupId}&status=pinned`,
    {
      headers: { 'Authorization': `Bearer ${pinataJwt}` },
    }
  );

  if (listRes.ok) {
    const listData = await listRes.json();
    return (listData.rows?.length || 0) + 1;
  }

  return 1;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { imageData, filename, groupName: reqGroupName, existingIpfsHash } = req.body;

  // Check if an existing IPFS hash already exists in the target group — skip upload if so
  // If the file exists in Pinata but not in the target group, add it to the group
  if (existingIpfsHash && reqGroupName) {
    const pinataJwtCheck = process.env.PINATA_JWT;
    if (pinataJwtCheck) {
      try {
        const groupId = await getOrCreateGroup(reqGroupName, pinataJwtCheck);
        const pinataGw = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

        // Check if hash already exists in the target group
        const listRes = await fetch(
          `https://api.pinata.cloud/data/pinList?groupId=${groupId}&status=pinned&hashContains=${existingIpfsHash}`,
          { headers: { 'Authorization': `Bearer ${pinataJwtCheck}` } }
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData.rows?.length > 0) {
            return res.status(200).json({
              success: true,
              url: `https://${pinataGw}/ipfs/${existingIpfsHash}`,
              ipfsHash: existingIpfsHash,
            });
          }
        }

        // File not in target group — check if it exists in Pinata at all
        const globalListRes = await fetch(
          `https://api.pinata.cloud/data/pinList?status=pinned&hashContains=${existingIpfsHash}`,
          { headers: { 'Authorization': `Bearer ${pinataJwtCheck}` } }
        );
        if (globalListRes.ok) {
          const globalListData = await globalListRes.json();
          if (globalListData.rows?.length > 0) {
            // File exists in Pinata but not in target group — add it to the group
            const addToGroupRes = await fetch(
              `https://api.pinata.cloud/v3/groups/public/${groupId}/cids`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${pinataJwtCheck}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cids: [existingIpfsHash] }),
              }
            );

            if (addToGroupRes.ok) {
              console.log(`Added existing file ${existingIpfsHash} to group "${reqGroupName}"`);
              return res.status(200).json({
                success: true,
                url: `https://${pinataGw}/ipfs/${existingIpfsHash}`,
                ipfsHash: existingIpfsHash,
              });
            } else {
              console.warn('Failed to add CID to group, will proceed with re-upload');
            }
          }
        }
      } catch (err) {
        console.warn('Check existing hash failed, will proceed with upload:', err);
      }
    }
  }

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

    // Use reqGroupName for the Pinata group, filename for the file name
    const groupName = reqGroupName || filename || 'event';

    // Create or find the group (folder) on Pinata
    const groupId = await getOrCreateGroup(groupName, pinataJwt);
    console.log('Pinata group:', groupName, '-> ID:', groupId);

    // Get next version number based on existing files in the group
    const version = await getNextVersion(groupId, pinataJwt);
    const baseName = filename || 'event';
    const versionedFilename = `${baseName}-v${version}`;
    console.log('Uploading as:', versionedFilename);

    // Upload file to IPFS with group and metadata
    const formData = new FormData();
    const blob = new Blob([buffer], { type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}` });
    formData.append('file', blob, versionedFilename);

    const metadata = JSON.stringify({
      name: versionedFilename,
      keyvalues: {
        version: String(version),
      },
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      groupId: groupId,
    });
    formData.append('pinataOptions', options);

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
