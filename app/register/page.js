import { Suspense } from 'react';
import { RegisterForm } from '@/components/AuthForms';

export const metadata = { title: 'Create an account' };

export default function Page() {
  return <Suspense fallback={null}><RegisterForm /></Suspense>;
}
