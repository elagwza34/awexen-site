/** معرّف البناء (commit hash) — نفس القيمة في CI وفي version.json المنشور. */
export const APP_BUILD_ID: string =
  typeof __APP_BUILD_ID__ === "string" && __APP_BUILD_ID__ ? __APP_BUILD_ID__ : "dev";

declare global {
  const __APP_BUILD_ID__: string;
}
