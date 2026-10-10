import { CmsSectionsProvider } from "../context/CmsContext";
import { CmsStyleSheet } from "../context/CmsStyleSheet";
import { FEATURES } from "../lib/features";
import Hero from "../components/Hero";
import Brands from "../components/Brands";
import Services from "../components/Services";
import Portfolio from "../components/Portfolio";
import Process from "../components/Process";
import WhyUs from "../components/WhyUs";
import Pricing from "../components/Pricing";
import PMSSection from "../components/PMSSection";
import CTA from "../components/CTA";
import LatestInsights from "../components/LatestInsights";

export default function Home() {
  return (
    <CmsSectionsProvider pageSlug="home">
      <CmsStyleSheet>
        <Hero />
        <Brands />
        <Services />
        <Portfolio />
        <Process />
        <WhyUs />
        <LatestInsights />
        <Pricing />
        {FEATURES.pms && <PMSSection />}
        <CTA />
      </CmsStyleSheet>
    </CmsSectionsProvider>
  );
}
