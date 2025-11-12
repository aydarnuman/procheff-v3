'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MerkezYonetimPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to main dashboard
    router.replace('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="text-slate-400">Yönlendiriliyor...</p>
      </div>
    </div>
  );
}
