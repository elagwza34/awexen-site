import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import FloatingActions from "./components/FloatingActions";
import ScrollProgress from "./components/ScrollProgress";
import MobileBar from "./components/MobileBar";
import Home from "./pages/Home";
import ServicesIndex from "./pages/ServicesIndex";
import ServiceDetail from "./pages/ServiceDetail";
import PortfolioPage from "./pages/PortfolioPage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ExportData from "./pages/ExportData";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsPage from "./pages/TermsPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import { ContentProvider } from "./context/ContentContext";
import { supabase } from "./lib/supabase";

function AwexenAdminRoute() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(session?.user.app_metadata.role === "admin");
      setCheckingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (checkingSession) {
    return (
      <section className="grid min-h-screen place-items-center bg-ink-950 text-white">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-brand-500" />
      </section>
    );
  }

  return authenticated ? <AdminDashboard /> : <AdminLogin />;
}

/** يضبط التمرير وعنوان الصفحة عند كل تنقل */
function RouteEffects() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        setTimeout(
          () => el.scrollIntoView({ behavior: "smooth", block: "start" }),
          70,
        );
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "awexen.com | وكالة رقمية — نبني تجارب رقمية متميزة",
      "/services": "خدماتنا | awexen.com",
      "/portfolio": "معرض الأعمال | awexen.com",
      "/about": "من نحن | awexen.com",
      "/contact": "تواصل معنا | awexen.com",
      "/export": "نقل البيانات | awexen.com",
      "/privacy": "سياسة الخصوصية | awexen.com",
      "/terms": "الشروط والأحكام | awexen.com",
      "/awexen": "لوحة التحكم | awexen.com",
    };
    document.title =
      titles[pathname] ??
      (pathname.startsWith("/services/")
        ? "تفاصيل الخدمة | awexen.com"
        : "awexen.com");
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ContentProvider>
        <AppShell />
      </ContentProvider>
    </BrowserRouter>
  );
}

function AppShell() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname === "/awexen" || pathname.startsWith("/awexen/");

  return (
    <>
      <RouteEffects />
      {!isAdminRoute && <ScrollProgress />}

      <a href="#main" className="skip-link">
        تخطَّ إلى المحتوى الرئيسي
      </a>

      <div
        className={`flex min-h-screen w-full min-w-0 flex-col overflow-x-clip font-sans ${
          isAdminRoute ? "bg-ink-950" : "bg-white"
        }`}
      >
        {!isAdminRoute && <Navbar />}

        <main id="main" className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<ServicesIndex />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/export" element={<ExportData />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/awexen" element={<AwexenAdminRoute />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {!isAdminRoute && (
          <>
            <Footer />
            <FloatingActions />
            <MobileBar />
          </>
        )}
      </div>
    </>
  );
}
