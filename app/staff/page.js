import { Suspense } from 'react';
import { StaffForm } from '@/components/AuthForms';

export const metadata = { title: 'Staff sign-in', robots: { index: false, follow: false } };

export default function Page() {
  return <Suspense fallback={null}><StaffForm /></Suspense>;
}
