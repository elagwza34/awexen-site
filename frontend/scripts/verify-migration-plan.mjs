import { readFileSync } from "node:fs";

const filename = /^\d{12,14}_[\w-]+\.sql$/;
const reviewed = (process.env.REVIEWED_MIGRATIONS ?? "").split(",").map((name) => name.trim());
if (!reviewed.every((name) => filename.test(name)) || new Set(reviewed).size !== reviewed.length) {
  throw new Error("Provide each reviewed migration filename once, separated by commas.");
}
const output = readFileSync(process.argv[2], "utf8");
const migrations = [...new Set(output.match(/\b\d{12,14}_[\w-]+\.sql\b/g) ?? [])].sort();
if (JSON.stringify(migrations) !== JSON.stringify(reviewed.sort())) {
  throw new Error("The database dry run does not match the approved filenames. No migrations were applied.");
}
console.log(`Verified migration plan: ${migrations.join(", ")}`);
