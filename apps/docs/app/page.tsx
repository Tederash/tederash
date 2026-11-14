import { HeroSection } from "../components/landing/HeroSection";
import { InteractiveShowcase } from "../components/landing/InteractiveShowcase";
import { OverlayComparison } from "../components/landing/OverlayComparison";
import { ArchitectureLayers } from "../components/landing/ArchitectureLayers";
import { CodeWalkthrough } from "../components/landing/CodeWalkthrough";
import { LocalizationFeature } from "../components/landing/LocalizationFeature";
import { AuditToolingSection } from "../components/landing/AuditToolingSection";
import { CtaSection } from "../components/landing/CtaSection";

export default function Home() {
  return (
    <div className="w-full flex flex-col">
      <HeroSection />
      <InteractiveShowcase />
      <OverlayComparison />
      <ArchitectureLayers />
      <CodeWalkthrough />
      <LocalizationFeature />
      <AuditToolingSection />
      <CtaSection />
    </div>
  );
}
