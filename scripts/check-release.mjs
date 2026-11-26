import { parseArgs } from "node:util";
import { loadEnv } from "vite";
import { checkRelease } from "./release-checks.mjs";

try {
  const { values } = parseArgs({
    options: {
      platform: { type: "string" },
      profile: { type: "string" },
      stage: { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });
  const root = process.cwd();
  const env = { ...loadEnv("production", root, ""), ...process.env };
  const result = checkRelease({
    root,
    env,
    platform: values.platform || "ios",
    profile: values.profile || env.DAREFLIP_RELEASE_PROFILE,
    stage: values.stage || "source",
  });
  for (const warning of result.warnings)
    console.warn(`Release note: ${warning}`);
  if (result.issues.length) {
    console.error(
      `Release preflight blocked (${result.issues.length} findings):\n${result.issues.map((issue) => `- ${issue}`).join("\n")}`,
    );
    process.exitCode = 1;
  } else
    console.log(
      "Release configuration checks passed for the specified stage. This is not native-device, legal, content-policy or Apple approval.",
    );
} catch (error) {
  console.error(`Release preflight failed: ${error.message}`);
  process.exitCode = 1;
}
