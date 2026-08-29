import { useEffect, useState } from "react";
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
import SeoManager from "./components/SeoManager";
import Blog, { BlogArticle } from "./pages/Blog";
import Jobs, { JobDetail } from "./pages/Jobs";
import Courses, { CourseDetail } from "./pages/Courses";
import CourseCheckout from "./pages/CourseCheckout";
import InstructorDashboard from "./pages/InstructorDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import DynamicPage from "./pages/DynamicPage";
import {
  LearningAuth,
  LearningGuard,
  LessonPlayer,
} from "./pages/Learning";
import KnowledgeChat from "./components/KnowledgeChat";
import { ContentProvider } from "./context/ContentContext";
import { LanguageProvider } from "./context/LanguageContext";
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
      setAuthenticated(
        ["owner", "admin", "editor", "hr", "support"].includes(
          String(session?.user.app_metadata.role ?? ""),
        ),
      );
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

function LegacyLoginRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/login", search: location.search, hash: location.hash }} replace />;
}

function AppShell() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname === "/awexen" || pathname.startsWith("/awexen/");
  const isLearningRoute = pathname === "/learn" || pathname.startsWith("/learn/");
  const isInstructorRoute = pathname === "/instructor" || pathname.startsWith("/instructor/");
  const isLoginRoute = pathname === "/login";
  const isStandaloneRoute = isAdminRoute || isLearningRoute || isInstructorRoute || isLoginRoute;
  const isLightPortal = isLearningRoute || isInstructorRoute;

  return (
    <>
      <RouteEffects />
      <SeoManager />
      {!isStandaloneRoute && <ScrollProgress />}

      <a href="#main" className="skip-link">
        تخطَّ إلى المحتوى الرئيسي
      </a>

      <div
        className={`flex min-h-screen w-full min-w-0 flex-col overflow-x-clip font-sans ${
          isLightPortal ? "bg-white" : isStandaloneRoute ? "bg-ink-950" : "bg-white"
        }`}
      >
        {!isStandaloneRoute && <Navbar />}

        <main id="main" className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<ServicesIndex />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:slug" element={<JobDetail />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route path="/login" element={<LearningAuth />} />
            <Route path="/learn/login" element={<LegacyLoginRedirect />} />
            <Route element={<LearningGuard />}>
              <Route path="/checkout/:slug" element={<CourseCheckout />} />
              <Route path="/learn" element={<StudentDashboard />} />
              <Route path="/learn/enrollments/:enrollmentId" element={<LessonPlayer />} />
              <Route path="/learn/enrollments/:enrollmentId/lessons/:lessonId" element={<LessonPlayer />} />
              <Route path="/instructor" element={<InstructorDashboard />} />
            </Route>
            <Route path="/pages/:slug" element={<DynamicPage />} />
            <Route path="/export" element={<ExportData />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/awexen" element={<AwexenAdminRoute />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {!isStandaloneRoute && (
          <>
            <Footer />
            <FloatingActions />
            <MobileBar />
            <KnowledgeChat />
          </>
        )}
      </div>
    </>
  );
}
