import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

export function productionProject() {
  const env = readFileSync(new URL("../.env.production", import.meta.url), "utf8");
  const read = (name) => env.match(new RegExp(`^${name}=([^\\r\\n]+)`, "m"))?.[1].trim();
  const url = new URL(read("VITE_SUPABASE_URL"));
  const key = read("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/$/.test(url.href) || !key?.startsWith("sb_publishable_")) {
    throw new Error("Production Supabase URL or publishable key is invalid.");
  }
  return { url, key, ref: url.hostname.split(".")[0] };
}

export async function verifyBackend({ url, key }, fetcher = fetch) {
  const headers = { apikey: key, "Content-Type": "application/json" };
  const requests = [
    ["LMS database readiness", "lms-public/health/ready", 200, undefined,
      (body) => body?.ok === true && body.checks?.database === true && body.checks?.edge_function === true],
    ["Anonymous LMS access denied", "lms-api?path=me", 401, undefined,
      (body) => Boolean(body && typeof body === "object" && !Array.isArray(body))],
    ["Calculator published configuration", "project-calculator", 200, { action: "config" },
      (body) => (body?.versionId === null && body.config === null) ||
        (typeof body?.versionId === "string" && Array.isArray(body.config?.projects))],
  ];
  await Promise.all(requests.map(async ([name, path, status, body, validate]) => {
    const response = await fetcher(new URL(`functions/v1/${path}`, url), {
      headers, method: body === undefined ? "GET" : "POST",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status !== status || !response.headers.get("content-type")?.includes("application/json")) {
      throw new Error(`${name}: expected HTTP ${status} with JSON, received HTTP ${response.status}.`);
    }
    if (!validate(await response.json())) throw new Error(`${name}: unexpected JSON contract.`);
  }));
  return requests.map(([name]) => name);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const project = productionProject();
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const checks = await verifyBackend(project);
      console.log(`Backend verified: ${checks.join(", ")}`);
      break;
    } catch (error) {
      console.error(`Backend probe ${attempt}: ${error.message}`);
      if (attempt === 6) {
        process.exitCode = 1;
        break;
      }
      await delay(10_000);
    }
  }
}
