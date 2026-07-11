import { redirect } from 'next/navigation';

/** This app exists only for the console — land straight on it. */
export default function Home() {
  redirect('/admin');
}
