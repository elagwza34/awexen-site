import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
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
import { isAdminAuthenticated } from "./lib/auth";

function ProtectedAdminRoute() {
  return isAdminAuthenticated() ? <AdminDashboard /> : <Navigate to="/login" replace />;
}

function PublicAdminLoginRoute() {
  return isAdminAuthenticated() ? <Navigate to="/admin" replace /> : <AdminLogin />;
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
      "/admin": "لوحة التحكم | awexen.com",
      "/login": "تسجيل الدخول | awexen.com",
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
        <RouteEffects />
        <ScrollProgress />

        <a href="#main" className="skip-link">
          تخطَّ إلى المحتوى الرئيسي
        </a>

        <div className="flex min-h-screen flex-col bg-white font-sans">
          <Navbar />

          <main id="main" className="flex-1">
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
              <Route path="/login" element={<PublicAdminLoginRoute />} />
              <Route path="/admin" element={<ProtectedAdminRoute />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          <Footer />
          <FloatingActions />
          <MobileBar />
        </div>
      </ContentProvider>
    </BrowserRouter>
  );
}
