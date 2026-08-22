import Hero from "../components/Hero";
import Brands from "../components/Brands";
import Services from "../components/Services";
import Portfolio from "../components/Portfolio";
import Process from "../components/Process";
import WhyUs from "../components/WhyUs";
import Pricing from "../components/Pricing";
import CTA from "../components/CTA";
import LatestInsights from "../components/LatestInsights";

export default function Home() {
  return (
    <>
      <Hero />
      <Brands />
      <Services />
      <Portfolio />
      <Process />
      <WhyUs />
      <LatestInsights />
      <Pricing />
      <CTA />
    </>
  );
}
