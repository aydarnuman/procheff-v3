'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PiyasaRobotuPage() {
  const router = useRouter();

  useEffect(() => {
    // Otomatik olarak yeni price-feed sayfasına yönlendir
    router.replace('/price-feed');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="text-center">
        <p className="text-white text-xl">Yeni fiyat takip sistemine yönlendiriliyorsunuz...</p>
      </div>
    </div>
  );
}