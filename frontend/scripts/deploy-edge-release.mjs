import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { productionProject } from "./check-production-backend.mjs";

const source = resolve(process.argv[2] ?? ".");
const artifact = resolve(process.argv[3] ?? "edge-release.json");
const token = process.env.SUPABASE_ACCESS_TOKEN;
const project = process.env.SUPABASE_PROJECT_REF;
if (!token || project !== productionProject().ref) {
  throw new Error("Configure the production access token and the matching SUPABASE_PROJECT_REF.");
}

const config = readFileSync(resolve(source, "supabase/config.toml"), "utf8");
const functions = new Map([...config.matchAll(/^\[functions\.([a-z0-9-]+)\]\s*\r?\nverify_jwt\s*=\s*(true|false)\s*$/gm)]
  .map(([, slug, jwt]) => [slug, jwt === "true"]));
const directories = readdirSync(resolve(source, "supabase/functions"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(resolve(source, "supabase/functions", entry.name, "index.ts")))
  .map((entry) => entry.name);
if (!functions.size || directories.length !== functions.size || directories.some((slug) => !functions.has(slug))) {
  throw new Error("The function inventory and JWT configuration do not match.");
}

const prerequisites = [
  ["202611270001_lms_atomic_instructor_assignment.sql", "public.lms_edge_write_course_instructor(uuid,uuid,uuid,boolean)"],
  ["202611270002_telemetry_hourly_aggregates.sql", "public.awexen_store_telemetry(text,text,text,text,text,text,text)"],
].filter(([migration]) => existsSync(resolve(source, "supabase/migrations", migration)));
if (prerequisites.length) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/database/query/read-only`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `select ${prerequisites.map(([, signature]) => `pg_catalog.to_regprocedure('${signature}') is not null`).join(" and ")} as ready`,
    }),
    signal: AbortSignal.timeout(20_000), redirect: "error",
  });
  if (!response.ok || (await response.json())?.[0]?.ready !== true) {
    throw new Error("The required database RPCs were not verified. Check database read permission and approved migrations.");
  }
}
if (functions.has("client-events")) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/secrets`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000), redirect: "error",
  });
  if (!response.ok || !(await response.json()).some((secret) => secret.name === "TELEMETRY_RATE_KEY")) {
    throw new Error("The TELEMETRY_RATE_KEY secret could not be confirmed.");
  }
}

async function inventory() {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/functions`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000), redirect: "error",
  });
  if (!response.ok) throw new Error(`Supabase function inventory returned HTTP ${response.status}.`);
  const list = await response.json();
  if (!Array.isArray(list)) throw new Error("Invalid Supabase function inventory.");
  return new Map(list.map((entry) => [entry.slug, entry]));
}

const revision = spawnSync("git", ["-C", source, "rev-parse", "HEAD"], { encoding: "utf8" });
if (revision.status !== 0) throw new Error("Unable to identify backend source commit.");
const before = await inventory();
const deployment = { project, commit: revision.stdout.trim(), complete: false, functions: [] };
const record = () => writeFileSync(artifact, JSON.stringify(deployment, null, 2) + "\n");
record();
for (const [slug, jwt] of functions) {
  const result = spawnSync("supabase", ["functions", "deploy", slug, "--project-ref", project, "--use-api",
    ...(!jwt ? ["--no-verify-jwt"] : [])], { cwd: source, stdio: "inherit", timeout: 180_000 });
  if (result.status !== 0) throw new Error(`Deployment failed for ${slug}. The artifact records verified deployments so far.`);
  const deployed = (await inventory()).get(slug);
  if (deployed?.status !== "ACTIVE" || deployed.verify_jwt !== jwt ||
      !Number.isSafeInteger(deployed.version) || deployed.version <= (before.get(slug)?.version ?? 0)) {
    throw new Error(`Supabase did not confirm a new active version with the expected JWT setting for ${slug}.`);
  }
  deployment.functions.push({ slug, version: deployed.version, verifyJwt: jwt, digest: deployed.ezbr_sha256 ?? null });
  record();
}
deployment.complete = true;
record();
