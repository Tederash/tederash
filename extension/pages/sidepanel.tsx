import Head from 'next/head';
import { ChatSidebar } from '../src/components/sidepanel/ChatSidebar';

export default function SidePanelPage() {
  return (
    <>
      <Head>
        <title>Tederash Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <ChatSidebar />
    </>
  );
}
