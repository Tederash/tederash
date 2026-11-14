import Head from 'next/head';
import { PopupView } from '../src/components/popup/PopupView';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Tederash</title>
      </Head>
      <PopupView />
    </>
  );
}
