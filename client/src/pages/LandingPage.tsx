import HeaderNav from '../components/landing/HeaderNav';
import HeroSection from '../components/landing/HeroSection';
import SportsBar from '../components/landing/SportsBar';
import LiveAuctionsSection from '../components/landing/LiveAuctionsSection';
import UpcomingAuctionsSection from '../components/landing/UpcomingAuctionsSection';
import UniqueFeatures from '../components/landing/UniqueFeatures';
import FeaturesGrid from '../components/landing/FeaturesGrid';
import TemplatesSection from '../components/landing/TemplatesSection';
import HowItWorks from '../components/landing/HowItWorks';
import DemoPreview from '../components/landing/DemoPreview';
import PricingSection from '../components/landing/PricingSection';
import ContactSection from '../components/landing/ContactSection';
import CTABanner from '../components/landing/CTABanner';
import Footer from '../components/landing/Footer';
import { usePublicAuctions } from '../hooks/usePublicAuctions';

export default function LandingPage() {
  const { live, upcoming, loading } = usePublicAuctions();

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Fixed header navigation */}
      <HeaderNav />

      {/* Hero section - add padding for fixed header */}
      <div className="pt-16">
        <HeroSection />
      </div>

      {/* Sports icons bar */}
      <SportsBar />

      {/* Live auctions section - only shown if there are live auctions */}
      <LiveAuctionsSection auctions={live} loading={loading} />

      {/* Upcoming auctions section - only shown if there are upcoming auctions */}
      <UpcomingAuctionsSection auctions={upcoming} loading={loading} />

      {/* Unique features - what makes us different */}
      <UniqueFeatures />

      {/* Features grid */}
      <FeaturesGrid />

      {/* Templates showcase */}
      <TemplatesSection />

      {/* How it works steps */}
      <HowItWorks />

      {/* Demo preview section */}
      <DemoPreview />

      {/* Pricing section */}
      <PricingSection />

      {/* Contact section */}
      <ContactSection />

      {/* Final CTA banner */}
      <CTABanner />

      {/* Footer */}
      <Footer />
    </div>
  );
}
