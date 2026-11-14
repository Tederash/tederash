import Head from 'next/head';
import { PopupView } from '../src/components/popup/PopupView';

export default function PopupPage() {
  return (
    <>
      <Head>
        <title>Tederash Menu</title>
      </Head>
      <PopupView />
    </>
  );
}
