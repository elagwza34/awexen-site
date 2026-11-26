import { Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import { lazyWithRetry } from "./lib/lazyRetry";
import Footer from "./components/Footer";
import FloatingActions from "./components/FloatingActions";
import FloatingDock from "./components/FloatingDock";
import ScrollProgress from "./components/ScrollProgress";
import MobileBar from "./components/MobileBar";
import SeoManager from "./components/SeoManager";
import ConsentPopup from "./components/ConsentPopup";
import AnalyticsRouteTracker from "./components/AnalyticsRouteTracker";
import { isOfferPath } from "./lib/offers";
import { ContentProvider } from "./context/ContentContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { DashboardThemeProvider } from "./context/DashboardThemeContext";
import type { Session } from "@supabase/supabase-js";
import type { DashboardAccess } from "./lib/roleRouting";
import {
  isAdminSessionUnlocked,
  lockAdminSession,
  unlockAdminSession,
} from "./lib/adminSession";

const Home = lazyWithRetry(() => import("./pages/Home"));
const ServicesIndex = lazyWithRetry(() => import("./pages/ServicesIndex"));
const ServiceDetail = lazyWithRetry(() => import("./pages/ServiceDetail"));
const PortfolioPage = lazyWithRetry(() => import("./pages/PortfolioPage"));
const PortfolioDetail = lazyWithRetry(() => import("./pages/PortfolioDetail"));
const PMS = lazyWithRetry(() => import("./pages/PMS"));
const About = lazyWithRetry(() => import("./pages/About"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const Quote = lazyWithRetry(() => import("./pages/Quote"));
const ProjectCalculator = lazyWithRetry(() => import("./pages/ProjectCalculator"));
const Initiative = lazyWithRetry(() => import("./pages/Initiative"));
const ExportData = lazyWithRetry(() => import("./pages/ExportData"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/PrivacyPolicy"));
const TermsPage = lazyWithRetry(() => import("./pages/TermsPage"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const PublicOffer = lazyWithRetry(() => import("./pages/PublicOffer"));
const Blog = lazyWithRetry(() => import("./pages/Blog"));
const BlogArticle = lazyWithRetry(() => import("./pages/Blog").then((module) => ({ default: module.BlogArticle })));
const Jobs = lazyWithRetry(() => import("./pages/Jobs"));
const JobDetail = lazyWithRetry(() => import("./pages/Jobs").then((module) => ({ default: module.JobDetail })));
const Courses = lazyWithRetry(() => import("./pages/Courses"));
const CourseDetail = lazyWithRetry(() => import("./pages/Courses").then((module) => ({ default: module.CourseDetail })));
const CourseCheckout = lazyWithRetry(() => import("./pages/CourseCheckout"));
const InstructorDashboard = lazyWithRetry(() => import("./pages/InstructorDashboard"));
const StudentDashboard = lazyWithRetry(() => import("./pages/StudentDashboard"));
const DynamicPage = lazyWithRetry(() => import("./pages/DynamicPage"));
const LearningAuth = lazyWithRetry(() => import("./pages/Learning").then((module) => ({ default: module.LearningAuth })));
const LearningGuard = lazyWithRetry(() => import("./pages/Learning").then((module) => ({ default: module.LearningGuard })));
const LearningErrorBoundary = lazyWithRetry(() => import("./pages/Learning").then((module) => ({ default: module.LearningErrorBoundary })));
const LessonPlayer = lazyWithRetry(() => import("./pages/Learning").then((module) => ({ default: module.LessonPlayer })));
const AiChat = lazyWithRetry(() => import("./pages/AiChat"));
const QueryOutlet = lazyWithRetry(() => import("./components/QueryOutlet"));

function RouteLoader({ dark = false }: { dark?: boolean }) {
  const { lang } = useLanguage();

  return (
    <section
      className={`grid min-h-[calc(100vh-74px)] place-items-center ${dark ? "bg-ink-950" : "bg-white"}`}
      aria-live="polite"
      aria-label={lang === "ar" ? "جارٍ تحميل الصفحة" : "Loading page"}
    >
      <span className={`h-10 w-10 animate-spin rounded-full border-4 border-t-brand-500 ${dark ? "border-white/15" : "border-ink-200"}`} />
    </section>
  );
}

function AwexenAdminRoute() {
  const [hasSession, setHasSession] = useState(false);
  const [sessionUserId, setSessionUserId] = useState("");
  const [sessionEmail, setSessionEmail] = useState("");
  const [access, setAccess] = useState<DashboardAccess | null>(null);
  const [accessError, setAccessError] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const start = async () => {
      // لوحة التحكم مسار نادر؛ بنحمّل السوبابيز وقت الحاجة بدل تحميل الصفحة الأولى.
      const [{ supabase }, { loadDashboardAccess }] = await Promise.all([
        import("./lib/supabase"),
        import("./lib/roleRouting"),
      ]);
      if (!active) return;
      if (!supabase) {
        setCheckingSession(false);
        return;
      }

      const checkSession = async (session: Session | null) => {
        if (!active) return;
        setHasSession(Boolean(session));
        setSessionUserId(session?.user.id ?? "");
        setSessionEmail(session?.user.email ?? "");
        // بنمسح الخطأ بس. access والـ hasSession existing لازم يفضلوا
        // زي ما هما أثناء إعادة التحقق، عشان ما يظهرش شاشة الخطأ
        // ولا الـ login في نص ثانية على كل حدث auth.
        setAccessError(false);
        if (!session) {
          lockAdminSession();
          setAdminUnlocked(false);
          setCheckingSession(false);
          return;
        }
        try {
          const nextAccess = await loadDashboardAccess(session);
          if (active) {
            setAccess(nextAccess);
            setAdminUnlocked(
              nextAccess.role === "admin" && isAdminSessionUnlocked(session.user.id),
            );
          }
        } catch {
          if (active) setAccessError(true);
        } finally {
          if (active) setCheckingSession(false);
        }
      };

      void supabase.auth.getSession().then(({ data }) => checkSession(data.session));
      subscription = supabase.auth.onAuthStateChange((_event, session) => {
        // مهم: ما نعملش setCheckingSession(true) هنا.
        // أي حدث auth (حتى INITIAL_SESSION أو TOKEN_REFRESHED) كان بيفكّ
        // AdminDashboard بالكامل ويرجّع الشاشة البيضاء، وده بيمسح كل
        // useState جواه — فـ"تعديل" كان بيفتح ويقفل في نفس اللحظة.
        // بعد أول تحقق بنحدّث في الخلفية من غير إعادة رسم للشاشة البيضاء.
        window.setTimeout(() => void checkSession(session), 0);
      }).data.subscription;
    };

    void start().catch(() => {
      if (active) setCheckingSession(false);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (checkingSession) {
    return (
      <section className="grid min-h-screen place-items-center bg-ink-950 text-white">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-brand-500" />
      </section>
    );
  }

  const handleAuthenticated = (userId: string) => {
    unlockAdminSession(userId);
    setAdminUnlocked(true);
  };

  if (!hasSession) return <AdminLogin onAuthenticated={handleAuthenticated} />;
  if (accessError || !access) {
    return (
      <section className="grid min-h-screen place-items-center bg-white px-4 text-center text-ink-950">
        <div>
          <p className="font-black">تعذر التحقق من صلاحية حساب الإدارة.</p>
          <p className="mt-2 text-sm text-ink-500">حدّث الصفحة، وإذا استمرت المشكلة سجّل الخروج ثم حاول مرة أخرى.</p>
        </div>
      </section>
    );
  }
  if (access.role !== "admin") return <Navigate to={access.path} replace />;
  if (!adminUnlocked) {
    return (
      <AdminLogin
        activeSessionEmail={sessionEmail}
        onAuthenticated={handleAuthenticated}
      />
    );
  }
  return <AdminDashboard userId={sessionUserId} />;
}

/** يضبط التمرير وعنوان الصفحة عند كل تنقل */
function RouteEffects() {
  const location = useLocation();
  const { pathname, hash, key } = location;
  const navigationType = useNavigationType();

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
    let storedPosition = 0;
    if (navigationType === "POP") {
      try {
        storedPosition = Number(window.sessionStorage.getItem(`awexen-scroll:${key}`) ?? 0);
      } catch {
        storedPosition = 0;
      }
    }
    window.requestAnimationFrame(() => window.scrollTo({ top: storedPosition, behavior: "instant" as ScrollBehavior }));
    return () => {
      try {
        window.sessionStorage.setItem(`awexen-scroll:${key}`, String(window.scrollY));
      } catch {
        /* Session storage may be unavailable in private browsing. */
      }
    };
  }, [hash, key, navigationType, pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ContentProvider>
          <AppShell />
        </ContentProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

function LegacyLoginRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/login", search: location.search, hash: location.hash }} replace />;
}

function LegacyAdminRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/awexen", search: location.search, hash: location.hash }} replace />;
}

function AppShell() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();
  const isAdminRoute = pathname === "/awexen" || pathname.startsWith("/awexen/")
    || pathname === "/admin" || pathname.startsWith("/admin/");
  const isLearningRoute = pathname === "/learn" || pathname.startsWith("/learn/");
  const isInstructorRoute = pathname === "/instructor" || pathname.startsWith("/instructor/");
  const isLoginRoute = pathname === "/login";
  const isChatRoute = pathname === "/chat" || pathname.startsWith("/chat/");
  const isClientOfferRoute = isOfferPath(pathname);
  const isCalculatorRoute = pathname.replace(/\/$/, "") === "/project-calculator";
  const isStandaloneRoute = isAdminRoute || isLearningRoute || isInstructorRoute || isLoginRoute || isChatRoute || isClientOfferRoute || pathname === "/reset-password";
  const isLightPortal = isLearningRoute || isInstructorRoute || isClientOfferRoute;

  return (
    <>
      <RouteEffects />
      <SeoManager />
      {!isClientOfferRoute && <AnalyticsRouteTracker />}
      {!isClientOfferRoute && <ConsentPopup />}
      {!isStandaloneRoute && <ScrollProgress />}

      <a href="#main" className="skip-link">
        {lang === "ar" ? "تخطَّ إلى المحتوى الرئيسي" : "Skip to main content"}
      </a>

      <div
        className={`flex min-h-screen w-full min-w-0 flex-col overflow-x-clip font-sans ${
          isLightPortal ? "bg-white" : isStandaloneRoute || isCalculatorRoute ? "bg-ink-950" : "bg-white"
        }`}
      >
        {!isStandaloneRoute && <Navbar />}

        <main id="main" className="min-w-0 flex-1">
          <Suspense fallback={<RouteLoader dark={!isStandaloneRoute} />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<ServicesIndex />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/portfolio/:slug" element={<PortfolioDetail />} />
            <Route path="/pms" element={<PMS />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/quote" element={<Quote />} />
            <Route path="/project-calculator" element={<ProjectCalculator />} />
            <Route path="/initiative" element={<Initiative />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:slug" element={<JobDetail />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:slug" element={<CourseDetail />} />
            <Route element={<QueryOutlet />}>
              <Route path="/login" element={<LearningAuth />} />
              <Route path="/learn/login" element={<LegacyLoginRedirect />} />
              <Route element={
                <LearningErrorBoundary>
                  <LearningGuard />
                </LearningErrorBoundary>
              }>
                <Route path="/checkout/:slug" element={<CourseCheckout />} />
                <Route path="/learn" element={<DashboardThemeProvider><StudentDashboard /></DashboardThemeProvider>} />
                <Route path="/learn/enrollments/:enrollmentId" element={<LessonPlayer />} />
                <Route path="/learn/enrollments/:enrollmentId/lessons/:lessonId" element={<LessonPlayer />} />
                <Route path="/instructor" element={<DashboardThemeProvider><InstructorDashboard /></DashboardThemeProvider>} />
              </Route>
              <Route path="/awexen" element={<DashboardThemeProvider><AwexenAdminRoute /></DashboardThemeProvider>} />
              <Route path="/:offerSlug" element={isClientOfferRoute ? <PublicOffer /> : <NotFound />} />
            </Route>
            <Route path="/pages/:slug" element={<DynamicPage />} />
            <Route path="/export" element={<ExportData />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/chat" element={<AiChat />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/admin" element={<LegacyAdminRedirect />} />
            <Route path="/admin/*" element={<LegacyAdminRedirect />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </main>

        {!isStandaloneRoute && (
          <>
            <Footer />
            {!isCalculatorRoute && <FloatingActions />}
            {!isCalculatorRoute && <FloatingDock />}
            {!isCalculatorRoute && <MobileBar />}
          </>
        )}
      </div>
    </>
  );
}
