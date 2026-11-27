import { chromium, devices } from "@playwright/test";

const url = new URL(process.argv[2] ?? "http://127.0.0.1:4173/");
const count = Number(process.argv[3] ?? 3);
if (!Number.isSafeInteger(count) || count < 1 || count > 10) throw new Error("Choose 1–10 samples.");

const browser = await chromium.launch({ headless: true });
try {
  for (let index = 0; index < count; index += 1) {
    const context = await browser.newContext({ ...devices["Moto G4"], serviceWorkers: "block" });
    try {
      const page = await context.newPage();
      const client = await context.newCDPSession(page);
      await client.send("Network.enable");
      await client.send("Network.setCacheDisabled", { cacheDisabled: true });
      await client.send("Network.emulateNetworkConditions", {
        offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750,
      });
      await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await client.send("Profiler.enable");
      await client.send("Profiler.start");
      await page.addInitScript(() => {
        const metrics = { lcp: 0, cls: 0, tasks: [] };
        window.__awexenLab = metrics;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        let clusterStart = -1;
        let previous = -1;
        let cluster = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.hadRecentInput) continue;
            if (entry.startTime - previous > 1000 || entry.startTime - clusterStart > 5000 || clusterStart < 0) {
              clusterStart = entry.startTime;
              cluster = 0;
            }
            previous = entry.startTime;
            cluster += entry.value;
            metrics.cls = Math.max(metrics.cls, cluster);
          }
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          for (const { startTime, duration } of list.getEntries()) metrics.tasks.push({ startTime, duration });
        }).observe({ type: "longtask", buffered: true });
      });
      const response = await page.goto(url.href, { waitUntil: "load", timeout: 90_000 });
      if (!response?.ok()) throw new Error(`Profile URL returned HTTP ${response?.status()}.`);
      await page.waitForTimeout(1500);
      const data = await page.evaluate(() => {
        const { lcp, cls, tasks } = window.__awexenLab;
        const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
        return {
          fcp: Math.round(fcp), lcp: Math.round(lcp), cls: Number(cls.toFixed(4)),
          observedBlockingMs: fcp ? Math.round(tasks.filter((task) => task.startTime >= fcp)
            .reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0)) : null,
          longTasks: tasks.map((task) => Math.round(task.duration)),
        };
      });
      const { profile } = await client.send("Profiler.stop");
      const scriptWork = new Map();
      for (const node of profile.nodes) {
        const script = node.callFrame.url ? node.callFrame.url.split("/").pop() : node.callFrame.functionName;
        if (script && node.hitCount) scriptWork.set(script, (scriptWork.get(script) ?? 0) + node.hitCount);
      }
      console.log(JSON.stringify({ sample: index + 1, ...data,
        busiest: [...scriptWork].sort((a, b) => b[1] - a[1]).slice(0, 8) }));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
