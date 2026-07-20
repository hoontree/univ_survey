import { Hero } from "@/components/landing/Hero";
import { DemoShowcase } from "@/components/landing/DemoShowcase";
import { TokenNotice } from "@/components/landing/TokenNotice";
import { TrackCards } from "@/components/landing/TrackCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SiteFooter } from "@/components/SiteFooter";

export default function LandingPage() {
  return (
    <>
      <main className="flex-1">
        <Hero />
        <DemoShowcase />
        <TokenNotice />
        <TrackCards />
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  );
}
