/**
 * Vizier plan-evaluation harness.
 *
 * Offline (default):
 *   npm run eval
 *   npm run eval -- path/to/plan.json
 *
 * LLM grading (requires an API key + provider configured):
 *   VIZIER_EVAL_LLM=1 npm run eval
 *
 * Exit code is non-zero when the offline score is below --min (default 70).
 */
import * as fs from "fs";
import * as path from "path";
import { evaluatePlan, gradePlanWithLLM } from "../src/core/eval";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const planArg = args.find((a) => !a.startsWith("--"));
  const minScore = Number(args.find((a) => a.startsWith("--min="))?.split("=")[1] ?? "70");
  const llm = process.env.VIZIER_EVAL_LLM === "1";

  const candidates = planArg
    ? [planArg]
    : [
        path.join(process.cwd(), "plan", "plan.json"),
        path.join(process.cwd(), ".vizier", "plans", "plan.json")
      ];

  const planPath = candidates.find((p) => fs.existsSync(p));
  if (!planPath) {
    console.error("No plan found. Looked at:\n  " + candidates.join("\n  "));
    process.exit(2);
  }

  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const result = evaluatePlan(plan);

  console.log(`\nPlan: ${plan.name || planPath}`);
  console.log(`Offline structural score: ${result.score}/100\n`);
  for (const c of result.checks) {
    const mark = c.ok ? "PASS" : c.severity === "error" ? "FAIL" : "WARN";
    console.log(`  [${mark}] ${c.name}${c.ok ? "" : ` — ${c.detail}`}`);
  }

  if (result.issues.length) {
    console.log("\nIssues:");
    for (const i of result.issues) console.log(`  - ${i}`);
  }

  if (llm) {
    console.log("\nRunning LLM grading (VIZIER_EVAL_LLM=1)...");
    const grade = await gradePlanWithLLM(plan);
    if (grade) {
      console.log(
        `  coherence=${grade.coherence} specificity=${grade.specificity} completeness=${grade.completeness} risks=${grade.risks}`
      );
      console.log(`  rationale: ${grade.rationale}`);
    } else {
      console.log("  LLM grading unavailable (no provider/key or parse failure).");
    }
  }

  console.log("");
  if (result.score < minScore) {
    console.error(`Score ${result.score} is below minimum ${minScore}.`);
    process.exit(1);
  }
  console.log("Eval OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(3);
});
