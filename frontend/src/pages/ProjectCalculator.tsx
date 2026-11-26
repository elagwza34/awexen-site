import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { calculate, visibleQuestions, type Answer, type Answers, type Estimate } from "../../../supabase/functions/_shared/calculator/engine.ts";
import { useLanguage } from "../context/LanguageContext";
import {
  CalculatorApiError, calculatorRequest, trackCalculator, type CalculatorConfiguration,
  type PublishedCalculator, type SavedEstimate,
} from "../calculator/publicApi";
import { calculatorText } from "../calculator/publicCopy";
import { CalculatorQuestion } from "../calculator/publicQuestion";
import { CalculatorQuotation, CostSummary } from "../calculator/publicQuotation";
import "../calculator/public.css";

const draftKey = "awexen-project-calculator-draft";
const projectStep = "~project-type";
type Draft = { versionId: string; projectId: string; answers: Answers; step: string; visited: string[]; sessionId: string };

function loadDraft(): Draft | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(draftKey) ?? "null") as Partial<Draft> | null;
    if (value && typeof value.versionId === "string" && typeof value.projectId === "string" &&
        typeof value.step === "string" && typeof value.sessionId === "string" && Array.isArray(value.visited) &&
        value.answers && typeof value.answers === "object" && !Array.isArray(value.answers)) return value as Draft;
  } catch {
    // The calculator also works with browser storage disabled.
  }
}

export default function ProjectCalculator() {
  const { lang, dir } = useLanguage();
  const t = calculatorText(lang);
  const [draft, setDraft] = useState(loadDraft);
  const [sessionId, setSessionId] = useState(() => draft?.sessionId ?? crypto.randomUUID());
  const [published, setPublished] = useState<PublishedCalculator | null>();
  const [loadError, setLoadError] = useState(false);
  const [configRequest, setConfigRequest] = useState(0);
  const [stale, setStale] = useState(false);
  const [projectId, setProjectId] = useState(draft?.projectId ?? "");
  const [answers, setAnswers] = useState<Answers>(draft?.answers ?? {});
  const [step, setStep] = useState(draft?.step ?? projectStep);
  const [visited, setVisited] = useState<string[]>(draft?.visited ?? [projectStep]);
  const [showIssues, setShowIssues] = useState(false);
  const [preview, setPreview] = useState<{ key: string; estimate?: Estimate; failed?: boolean }>();
  const [saved, setSaved] = useState<SavedEstimate>();
  const [generating, setGenerating] = useState(false);
  const [estimateFailed, setEstimateFailed] = useState(false);
  const [focusRequested, setFocusRequested] = useState(0);
  const estimateFlight = useRef<AbortController | null>(null);
  const estimateRequest = useRef<{ key: string; id: string } | null>(null);
  const started = useRef(Boolean(draft?.projectId));
  const lastViewed = useRef("");
  const startedSections = useRef(new Set<string>());
  const layout = useRef<HTMLDivElement>(null);
  const pendingQuestion = useRef<string | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    void calculatorRequest<CalculatorConfiguration>({ action: "config" }, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      setPublished(data.config === null ? null : data);
      if (data.config === null) return;
      const previous = loadDraft();
      if (previous && previous.versionId !== data.versionId) setStale(true);
    }).catch(() => {
      if (!controller.signal.aborted) {
        setLoadError(true);
        setPublished(null);
      }
    });
    return () => controller.abort();
  }, [configRequest]);

  const config = published?.config;
  const projects = useMemo(() => (config?.projects ?? []).filter((project) => project.active).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [config]);
  const activeProject = projects.find((project) => project.id === projectId);
  const resolved = useMemo(() => config && activeProject ? visibleQuestions(config, activeProject.id, answers) : undefined, [config, activeProject, answers]);
  const local = useMemo(() => {
    if (!config || !activeProject) return undefined;
    try {
      return calculate(config, activeProject.id, answers);
    } catch {
      return undefined;
    }
  }, [config, activeProject, answers]);
  const sections = (config?.sections ?? [])
    .filter((section) => resolved?.questions.some((question) => question.sectionId === section.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const steps = [projectStep, ...sections.map((section) => section.id)];
  const currentStep = steps.includes(step) ? step
    : [...visited].reverse().find((id) => steps.includes(id)) ?? projectStep;
  const currentIndex = steps.indexOf(currentStep);
  const currentSection = sections.find((section) => section.id === currentStep);
  const last = currentIndex === steps.length - 1;
  const calculation = useMemo(() => published && activeProject ? { versionId: published.versionId, projectId: activeProject.id, answers } : undefined, [published, activeProject, answers]);
  const answerKey = useMemo(() => calculation ? JSON.stringify(calculation) : "", [calculation]);
  const display = saved?.quotation.estimate ?? (preview?.key === answerKey ? preview.estimate ?? local : local);
  const previewStatus = saved || !calculation ? undefined
    : preview?.key !== answerKey ? t("calculating")
    : preview.failed ? t("previewFailed") : t("verified");
  const ready = Boolean(activeProject && config);
  const available = projects.length > 0;
  const stickyVisible = Boolean(config && available);

  useEffect(() => {
    if (!config || lastViewed.current === sessionId) return;
    lastViewed.current = sessionId;
    trackCalculator("viewed", sessionId);
  }, [config, sessionId]);

  useEffect(() => {
    if (!currentSection || saved) return;
    const sectionId = currentSection.id;
    const key = `${sessionId}:${projectId}:${sectionId}`;
    if (startedSections.current.has(key)) return;
    startedSections.current.add(key);
    trackCalculator("section_started", sessionId, projectId, sectionId);
  }, [currentSection, projectId, saved, sessionId]);

  useEffect(() => {
    if (!published || (!activeProject && !draft)) return;
    const next = { versionId: published.versionId, projectId, answers, step: currentStep, visited, sessionId };
    try { sessionStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* Storage is optional. */ }
  }, [published, projectId, answers, currentStep, visited, sessionId, activeProject, draft]);

  useEffect(() => {
    if (!stickyVisible || !layout.current) return;
    const container = layout.current;
    const summary = container.querySelector(".calculator-summary");
    if (!summary) return;
    const resize = new ResizeObserver(() => {
      container.style.setProperty("--calculator-scroll-offset", `${summary.getBoundingClientRect().height + 92}px`);
    });
    resize.observe(summary);
    return () => resize.disconnect();
  }, [stickyVisible]);

  useEffect(() => {
    if (!focusRequested) return;
    const target = pendingQuestion.current && document.getElementById(`calculator-question-${pendingQuestion.current}`);
    const panel = document.getElementById("calculator-step");
    const focus = target ? target.querySelector<HTMLElement>("input, select, textarea, button") : panel?.querySelector<HTMLElement>("[tabindex='-1']");
    (target || panel)?.scrollIntoView({ block: "start" });
    focus?.focus({ preventScroll: true });
    pendingQuestion.current = undefined;
  }, [focusRequested]);

  useEffect(() => {
    if (!calculation || saved || generating) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void calculatorRequest<{ estimate: Estimate }>({ action: "preview", ...calculation }, controller.signal).then(({ estimate }) => {
        if (!controller.signal.aborted) setPreview({ key: answerKey, estimate });
      }).catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof CalculatorApiError && error.code === "stale_config") {
          setPublished(undefined);
          setStale(true);
          setConfigRequest((current) => current + 1);
        } else {
          setPreview({ key: answerKey, failed: true });
        }
      });
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [calculation, answerKey, saved, generating]);

  useEffect(() => () => estimateFlight.current?.abort(), []);

  const moveTo = (id: string, questionId?: string) => {
    setStep(id);
    setVisited((current) => current.includes(id) ? current : [...current, id]);
    pendingQuestion.current = questionId;
    setFocusRequested((index) => index + 1);
  };
  const changeAnswer = (questionId: string, value: Answer) => {
    setEstimateFailed(false);
    setPreview(undefined);
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };
  const selectProject = (next: string) => {
    if (next === projectId) return;
    setProjectId(next);
    setAnswers({});
    setVisited([projectStep]);
    setShowIssues(false);
    setEstimateFailed(false);
    setPreview(undefined);
    if (!started.current) {
      started.current = true;
      trackCalculator("started", sessionId, next);
    }
    trackCalculator("project_selected", sessionId, next);
  };
  const reset = () => {
    if (projectId && !window.confirm(t("resetConfirm"))) return;
    try { sessionStorage.removeItem(draftKey); } catch { /* Storage is optional. */ }
    setDraft(undefined);
    setSessionId(crypto.randomUUID());
    setSaved(undefined);
    setProjectId("");
    setAnswers({});
    setVisited([projectStep]);
    setPreview(undefined);
    setShowIssues(false);
    setEstimateFailed(false);
    started.current = false;
    setStale(false);
    estimateRequest.current = null;
    moveTo(projectStep);
  };
  const generate = async () => {
    if (!calculation || estimateFlight.current) return;
    const failed = resolved?.questions.find((question) => local?.errors[question.id]);
    if (!local || Object.keys(local.errors).length > 0) {
      setShowIssues(true);
      setEstimateFailed(!failed);
      if (failed) moveTo(failed.sectionId, failed.id);
      return;
    }
    if (estimateRequest.current?.key !== answerKey) estimateRequest.current = { key: answerKey, id: crypto.randomUUID() };
    const controller = new AbortController();
    estimateFlight.current = controller;
    setGenerating(true);
    setEstimateFailed(false);
    try {
      const result = await calculatorRequest<SavedEstimate>({ action: "estimate", ...calculation, requestId: estimateRequest.current.id }, controller.signal);
      if (controller.signal.aborted) return;
      setSaved(result);
      trackCalculator("completed", sessionId, projectId);
      trackCalculator("estimate_generated", sessionId, projectId);
      setFocusRequested((index) => index + 1);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof CalculatorApiError && error.code === "stale_config") {
        setStale(true);
        setPublished(undefined);
        setConfigRequest((current) => current + 1);
      } else {
        setEstimateFailed(true);
      }
    } finally {
      if (estimateFlight.current === controller) estimateFlight.current = null;
      if (!controller.signal.aborted) setGenerating(false);
    }
  };
  const advance = () => {
    const failed = resolved?.questions.find((question) => question.sectionId === currentStep && local?.errors[question.id]);
    if (failed) {
      setShowIssues(true);
      moveTo(currentStep, failed.id);
      return;
    }
    setShowIssues(false);
    if (currentSection) trackCalculator("section_completed", sessionId, projectId, currentStep);
    if (last) void generate();
    else moveTo(steps[currentIndex + 1]);
  };
  const fieldIssue = (id: string) => !showIssues ? undefined : resolved?.errors[id] ? t("invalid") : resolved?.missing.includes(id) ? t("required") : local?.errors[id] ? t("conflict") : undefined;

  return (
    <div className="project-calculator" lang={lang} dir={dir}>
      <div className="calculator-layout" ref={layout}>
        <header className="calculator-intro"><h1>{t("title")}</h1><p className="calculator-muted">{t("intro")}</p></header>
        {stickyVisible && <CostSummary estimate={display} lang={lang} status={generating ? t("calculating") : previewStatus}
          breakdown={(saved?.quotation.settings.showBreakdown ?? config?.settings.showBreakdown) !== false} />}
        {stale && <p role="status" className="calculator-notice">{t("stale")}</p>}
        {published === undefined && <p role="status">{t("loading")}</p>}
        {published !== undefined && !available && (
          <section className="calculator-panel">
            <p>{t("unavailable")}</p>
            <div className="calculator-actions">
              <Link className="calculator-button calculator-button-primary" to="/quote">{t("contact")}</Link>
              {loadError && <button type="button" className="calculator-button" onClick={() => {
                setPublished(undefined);
                setLoadError(false);
                setConfigRequest((current) => current + 1);
              }}>{t("retry")}</button>}
            </div>
          </section>
        )}
        {saved ? <CalculatorQuotation key={saved.quotation.reference} saved={saved} lang={lang} sessionId={sessionId}
          leadFields={config?.settings.leadFields} onEdit={() => { estimateRequest.current = null; setSaved(undefined); moveTo(currentStep); }} />
          : config && available && (
            <>
              <nav className="calculator-progress" aria-label={t("title")}>
                {steps.map((id, index) => (
                  <button key={id} type="button" className="calculator-button" aria-current={currentStep === id ? "step" : undefined}
                    disabled={generating || (!visited.includes(id) && id !== currentStep)} onClick={() => moveTo(id)}>
                    {index + 1}. {id === projectStep ? t("project") : sections.find((section) => section.id === id)?.title[lang]}
                  </button>
                ))}
              </nav>
              <section className="calculator-panel" id="calculator-step">
                <h2 tabIndex={-1}>{currentSection?.title[lang] ?? t("project")}</h2>
                {currentSection?.description && <p className="calculator-muted">{currentSection.description[lang]}</p>}
                <fieldset disabled={generating}>
                  {currentStep === projectStep ? (
                    <div className="calculator-project-grid">
                      {projects.map((project) => (
                        <label key={project.id} className="calculator-project">
                          <input type="radio" name="calculator-project" value={project.id} checked={projectId === project.id} onChange={() => selectProject(project.id)} />
                          <span><strong>{project.title[lang]}</strong><span className="calculator-muted">{project.description[lang]}</span></span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="calculator-questions">
                      {resolved?.questions.filter((question) => question.sectionId === currentStep).map((question) => (
                        <CalculatorQuestion key={question.id} question={question} value={answers[question.id] ?? resolved.answers[question.id]}
                          issue={fieldIssue(question.id)} lang={lang} onChange={(value) => changeAnswer(question.id, value)} />
                      ))}
                    </div>
                  )}
                  {estimateFailed && <p role="alert" className="calculator-error">
                    {local && Object.keys(local.errors).length > 0 ? t("conflict") : t("actionFailed")}
                  </p>}
                  <div className="calculator-actions">
                    {currentIndex > 0 && <button type="button" className="calculator-button" onClick={() => { setShowIssues(false); moveTo(steps[currentIndex - 1]); }}>{t("previous")}</button>}
                    {projectId && <button type="button" className="calculator-button" onClick={reset}>{t("reset")}</button>}
                    <button type="button" className="calculator-button calculator-button-primary push" disabled={!ready || generating} onClick={advance}>
                      {t(generating ? "calculating" : last ? "calculate" : "next")}
                    </button>
                  </div>
                </fieldset>
              </section>
            </>
          )}
      </div>
    </div>
  );
}
