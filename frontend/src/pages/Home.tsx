import Hero from "../components/Hero";
import Brands from "../components/Brands";
import Services from "../components/Services";
import Portfolio from "../components/Portfolio";
import Process from "../components/Process";
import WhyUs from "../components/WhyUs";
import Testimonials from "../components/Testimonials";
import Pricing from "../components/Pricing";
import CTA from "../components/CTA";

export default function Home() {
  return (
    <>
      <Hero />
      <Brands />
      <Services />
      <Portfolio />
      <Process />
      <WhyUs />
      <Testimonials />
      <Pricing />
      <CTA />
    </>
  );
}
