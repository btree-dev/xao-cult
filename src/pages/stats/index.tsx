// pages/stats/index.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function StatsIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/stats/swap-token');
  }, [router]);
  return null;
}
