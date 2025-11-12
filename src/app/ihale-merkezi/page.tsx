'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function IhaleMerkeziPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to analysis page
    router.replace('/analysis');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-slate-400">Yönlendiriliyor...</p>
      </div>
    </div>
  );
}
