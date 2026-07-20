import { Hero } from "@/components/landing/Hero";
import { TrackCards } from "@/components/landing/TrackCards";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SiteFooter } from "@/components/SiteFooter";

export default function LandingPage() {
  return (
    <>
      <main className="flex-1">
        <Hero />
        <TrackCards />
        <HowItWorks />
      </main>
      <SiteFooter />
    </>
  );
}
