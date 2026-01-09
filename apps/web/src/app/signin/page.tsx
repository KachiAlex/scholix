import { redirect } from 'next/navigation';

export default function SignInPage() {
  redirect('/portal?mode=login');
}
