import { Hero } from "../components/landing/Hero";
import { LiveDemo } from "../components/landing/LiveDemo";
import { GettingStarted } from "../components/landing/GettingStarted";
import { Packages } from "../components/landing/Packages";

export default function Home() {
  return (
    <main data-pagefind-body className="w-full flex flex-col">
      <Hero />
      <LiveDemo />
      <GettingStarted />
      <Packages />
    </main>
  );
}
