import HeroSection from '../components/landing/HeroSection';
import SportsBar from '../components/landing/SportsBar';
import FeaturesGrid from '../components/landing/FeaturesGrid';
import HowItWorks from '../components/landing/HowItWorks';
import StatsCounter from '../components/landing/StatsCounter';
import DemoPreview from '../components/landing/DemoPreview';
import CTABanner from '../components/landing/CTABanner';
import Footer from '../components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero with integrated navigation */}
      <HeroSection />

      {/* Sports icons bar */}
      <SportsBar />

      {/* Stats counter with animated numbers */}
      <StatsCounter />

      {/* Features grid */}
      <section id="features">
        <FeaturesGrid />
      </section>

      {/* How it works steps */}
      <HowItWorks />

      {/* Demo preview section */}
      <DemoPreview />

      {/* Final CTA banner */}
      <CTABanner />

      {/* Footer */}
      <Footer />
    </div>
  );
}
