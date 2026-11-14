import Head from 'next/head';
import { ChatSidebar } from '../src/components/sidepanel/ChatSidebar';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Tederash Assistant</title>
      </Head>
      <ChatSidebar />
    </>
  );
}
