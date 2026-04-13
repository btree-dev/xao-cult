import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, walletAddress, dynamicUserId } = req.body;

  if (!email && !walletAddress) {
    return res.status(400).json({ error: 'Email or wallet address required' });
  }

  // Use email if available, otherwise generate a deterministic email from wallet address
  const userEmail = email || `${walletAddress.toLowerCase()}@wallet.local`;

  try {
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === userEmail);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create user with confirmed email
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          dynamic_user_id: dynamicUserId,
          wallet_address: walletAddress,
        },
      });

      if (createError || !newUser.user) {
        console.error('Error creating Supabase user:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      userId = newUser.user.id;
    }

    // Generate a magic link to get session tokens
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });

    if (linkError || !linkData) {
      console.error('Error generating link:', linkError);
      return res.status(500).json({ error: 'Failed to generate session' });
    }

    // Return the hashed token for client-side verification
    const tokenHash = linkData.properties?.hashed_token;

    return res.status(200).json({
      token_hash: tokenHash,
      email: userEmail,
      user_id: userId,
    });
  } catch (error) {
    console.error('Dynamic session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
