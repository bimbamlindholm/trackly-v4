import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, getRedirectPathByRole } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import HowItWorks from "../components/HowItWorks";
import Pricing from "../components/Pricing";
import AboutUs from "../components/AboutUs";
import Contact from "../components/Contact";
import PageTransition from "../components/PageTransition";
import SkeletonLoader from "../components/SkeletonLoader";

function LandingPage() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (!role) {
        // Hydrated user but no profile role set yet -> complete registration
        navigate("/complete-registration", { replace: true });
      } else {
        // Hydrated user with an active role -> go to dashboard
        navigate(getRedirectPathByRole(role), { replace: true });
      }
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <PageTransition>
      <main className="relative min-h-screen overflow-x-hidden bg-[#07111F] text-slate-50">
        <div className="galaxy-bg" />
        <div className="noise-overlay" />

        <div className="relative z-10">
          <Navbar />
          <Hero />
          <Features />
          <HowItWorks />
          <Pricing />
          <AboutUs />
          <Contact />
        </div>
      </main>
    </PageTransition>
  );
}

export default LandingPage;
