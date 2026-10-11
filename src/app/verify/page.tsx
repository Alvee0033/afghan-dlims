'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`/${q ? `?${q}` : ''}`);
  }, [router, searchParams]);

  return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif', color: '#475569' }}>
      Verifying Driving License...
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>}>
      <VerifyRedirect />
    </Suspense>
  );
}
