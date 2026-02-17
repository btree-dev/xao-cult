import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { groupName } = req.body;

  if (!groupName) {
    return res.status(400).json({ success: false, error: 'No group name provided' });
  }

  const pinataJwt = process.env.PINATA_JWT;

  if (!pinataJwt) {
    return res.status(500).json({ success: false, error: 'Pinata JWT not configured' });
  }

  try {
    // Find the group by name
    const listRes = await fetch(
      `https://api.pinata.cloud/v3/groups/public?name=${encodeURIComponent(groupName)}&limit=1`,
      { headers: { 'Authorization': `Bearer ${pinataJwt}` } }
    );

    if (!listRes.ok) {
      return res.status(200).json({ success: true, message: 'Group not found, nothing to delete' });
    }

    const listData = await listRes.json();
    const group = listData.data?.groups?.find((g: any) => g.name === groupName);

    if (!group) {
      return res.status(200).json({ success: true, message: 'Group not found, nothing to delete' });
    }

    // Unpin all files in the group before deleting it
    try {
      const pinListRes = await fetch(
        `https://api.pinata.cloud/data/pinList?groupId=${group.id}&status=pinned&pageLimit=100`,
        { headers: { 'Authorization': `Bearer ${pinataJwt}` } }
      );

      if (pinListRes.ok) {
        const pinListData = await pinListRes.json();
        const pins = pinListData.rows || [];

        for (const pin of pins) {
          try {
            await fetch(
              `https://api.pinata.cloud/pinning/unpin/${pin.ipfs_pin_hash}`,
              {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${pinataJwt}` },
              }
            );
            console.log('Unpinned file:', pin.ipfs_pin_hash);
          } catch (unpinErr) {
            console.warn('Failed to unpin file:', pin.ipfs_pin_hash, unpinErr);
          }
        }

        console.log(`Unpinned ${pins.length} file(s) from group "${groupName}"`);
      }
    } catch (listErr) {
      console.warn('Failed to list pins in group, proceeding with group deletion:', listErr);
    }

    // Delete the group
    const deleteRes = await fetch(
      `https://api.pinata.cloud/v3/groups/public/${group.id}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${pinataJwt}` },
      }
    );

    if (!deleteRes.ok) {
      const errData = await deleteRes.json();
      console.error('Failed to delete Pinata group:', errData);
      return res.status(500).json({ success: false, error: 'Failed to delete group' });
    }

    console.log('Deleted Pinata group:', groupName, '-> ID:', group.id);
    return res.status(200).json({ success: true, message: `Group "${groupName}" deleted` });
  } catch (error) {
    console.error('Delete group error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete group',
    });
  }
}
