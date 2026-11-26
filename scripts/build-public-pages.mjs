import {
  mkdir,
  readFile,
  readdir,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { parseArgs } from "node:util";
import { pageCopy } from "../site/content.mjs";
import {
  validatePublisher as validateSharedPublisher,
  publicHttpsUrl,
} from "../src/config/publisher-schema.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const schema = "dareflip-public-pages/v1";
const generatedFiles = [
  "index.html",
  "privacy.html",
  "terms.html",
  "support.html",
  "build-manifest.json",
];
/** Share the exact public-identity rules used by the app (Node 24 strips TS types). */
export function validatePublisher(input) {
  const { publisher, issues } = validateSharedPublisher(input);
  if (issues.length)
    throw new Error(`Cannot build public pages:\n- ${issues.join("\n- ")}`);
  const configured = { ...publisher };
  if (input.termsUrl) {
    const value =
      typeof input.termsUrl === "string" ? input.termsUrl.trim() : "";
    if (!publicHttpsUrl(value))
      throw new Error(
        "termsUrl: provide the actual public HTTPS URL without credentials or a fragment.",
      );
    configured.termsUrl = value;
  }
  return configured;
}

export function parseAdMode(value) {
  if (value !== "true" && value !== "false")
    throw new Error(
      "Set VITE_ADS_ENABLED explicitly to true or false, or pass --ads-enabled true|false.",
    );
  return value === "true";
}

function escape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function dateValue(value) {
  const date =
    value ??
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ||
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw new Error("--updated must be a real date in YYYY-MM-DD format.");
  return date;
}

function nav(publisher) {
  const links = [
    [publisher.websiteUrl, "Home", "Ana sayfa"],
    [publisher.privacyUrl, "Privacy", "Gizlilik"],
    [publisher.supportUrl, "Support", "Destek"],
    ...(publisher.termsUrl ? [[publisher.termsUrl, "Terms", "Koşullar"]] : []),
  ];
  return links
    .map(
      ([href, en, tr]) =>
        `<a href="${escape(href)}">${escape(en)} / <span lang="tr">${escape(tr)}</span></a>`,
    )
    .join("");
}

function layout({ title, body, canonical, publisher, updated, css, favicon }) {
  const mailto = `mailto:${encodeURIComponent(publisher.supportEmail).replaceAll("%40", "@")}`;
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#151022"><link rel="icon" href="${escape(favicon)}"><title>${escape(title)} · DareFlip</title>${canonical ? `<link rel="canonical" href="${escape(canonical)}">` : ""}<style>${css}</style></head><body><header><a class="brand" href="${escape(publisher.websiteUrl)}">DareFlip<span aria-hidden="true">✦</span></a><nav aria-label="Publisher pages / Yayıncı sayfaları">${nav(publisher)}</nav></header><main>${body}</main><footer><p>Publisher / <span lang="tr">Yayıncı</span>: ${escape(publisher.name)}</p><p><a href="${escape(mailto)}">${escape(publisher.supportEmail)}</a></p><p>Updated / <span lang="tr">Güncelleme</span>: <time datetime="${escape(updated)}">${escape(updated)}</time></p></footer></body></html>\n`;
}

function renderSections(sections) {
  return sections
    .map(
      ({ title, paragraphs, links = [] }) =>
        `<section><h3>${escape(title)}</h3>${paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`).join("")}${links.length ? `<ul class="links">${links.map(({ href, label }) => `<li><a href="${escape(href)}">${escape(label)}</a></li>`).join("")}</ul>` : ""}</section>`,
    )
    .join("");
}

export async function buildPublicPages({
  configPath,
  outDir,
  adsEnabled,
  updated,
} = {}) {
  const configFile = path.resolve(
    configPath ?? path.join(root, "src/config/publisher.json"),
  );
  let input;
  try {
    input = JSON.parse(await readFile(configFile, "utf8"));
  } catch (error) {
    throw new Error(
      `Cannot read publisher JSON configuration: ${error.code ?? error.name}. Complete the publisher configuration before building public pages.`,
      { cause: error },
    );
  }
  const publisher = validatePublisher(input);
  const ads =
    typeof adsEnabled === "boolean"
      ? adsEnabled
      : parseAdMode(adsEnabled ?? process.env.VITE_ADS_ENABLED);
  const date = dateValue(updated);
  const [css, icon] = await Promise.all([
    readFile(new URL("../site/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../public/icon.svg", import.meta.url), "utf8"),
  ]);
  const favicon = `data:image/svg+xml,${encodeURIComponent(icon)}`;
  const output = path.resolve(
    outDir ?? path.join(root, "artifacts/legal-site"),
  );
  const canonical = {
    index: publisher.websiteUrl,
    privacy: publisher.privacyUrl,
    support: publisher.supportUrl,
    terms: publisher.termsUrl ?? null,
  };
  const files = {};
  for (const page of ["privacy", "terms", "support"]) {
    const copy = pageCopy(page, publisher, ads);
    const body = `<h1>${escape(copy.title)} <span lang="tr">/ ${escape(copy.titleTr)}</span></h1><p class="meta">${escape(date)}</p><nav class="languages" aria-label="Languages / Diller"><a href="#en" lang="en">English</a><a href="#tr" lang="tr">Türkçe</a></nav><section class="locale" id="en" lang="en"><h2>English</h2>${renderSections(copy.en)}</section><section class="locale" id="tr" lang="tr"><h2>Türkçe</h2>${renderSections(copy.tr)}</section>`;
    files[`${page}.html`] = layout({
      title: copy.title,
      body,
      canonical: canonical[page],
      publisher,
      updated: date,
      css,
      favicon,
    });
  }
  const intro = `<h1>DareFlip</h1><p>Publisher information, privacy and support. <span lang="tr">Yayıncı bilgileri, gizlilik ve destek.</span></p><div class="contact"><p>${escape(publisher.name)}</p><p>${escape(publisher.supportEmail)}</p></div><div class="cards"><section class="card"><h2>Privacy / <span lang="tr">Gizlilik</span></h2><a href="${escape(publisher.privacyUrl)}">Read the policy / <span lang="tr">Politikayı okuyun</span></a></section><section class="card"><h2>Support / <span lang="tr">Destek</span></h2><a href="${escape(publisher.supportUrl)}">Get help / <span lang="tr">Yardım alın</span></a></section>${publisher.termsUrl ? `<section class="card"><h2>Terms / <span lang="tr">Koşullar</span></h2><a href="${escape(publisher.termsUrl)}">Read the terms / <span lang="tr">Koşulları okuyun</span></a></section>` : ""}</div>`;
  files["index.html"] = layout({
    title: "Publisher information",
    body: intro,
    canonical: publisher.websiteUrl,
    publisher,
    updated: date,
    css,
    favicon,
  });
  if (
    Object.values(files).some((html) =>
      /\{\{[A-Z_]+\}\}|\[REQUIRED BEFORE PUBLICATION\]/.test(html),
    )
  )
    throw new Error(
      "Unresolved publisher placeholders remain; no public pages were written.",
    );

  // Do not overwrite an unrelated folder or remove user files on a repeat build.
  try {
    const entries = await readdir(output);
    if (entries.length) {
      const existing = JSON.parse(
        await readFile(path.join(output, "build-manifest.json"), "utf8"),
      );
      if (
        existing.schema !== schema ||
        entries.some((entry) => !generatedFiles.includes(entry))
      )
        throw new Error(
          "Output directory is not exclusively a DareFlip-generated site.",
        );
    }
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new Error(`Output preserved: ${error.message}`, { cause: error });
    // A pre-existing nonempty directory without a manifest is not an empty output.
    try {
      const entries = await readdir(output);
      if (entries.length)
        throw new Error(
          "Output preserved: existing files have no DareFlip build manifest.",
          { cause: error },
        );
    } catch (checkError) {
      if (checkError.code !== "ENOENT") throw checkError;
    }
  }
  await mkdir(output, { recursive: true });
  for (const [name, html] of Object.entries(files)) {
    const file = path.join(output, name);
    try {
      const entry = await stat(file);
      if (!entry.isFile())
        throw new Error(`Output preserved: ${name} is not a regular file.`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const temporary = `${file}.tmp`;
    await writeFile(temporary, html, { encoding: "utf8", flag: "wx" });
    await rename(temporary, file);
  }
  const manifest = {
    schema,
    updated: date,
    adsEnabled: ads,
    publisher,
    pages: Object.entries(canonical).map(([page, url]) => ({
      file: `${page}.html`,
      canonicalUrl: url,
    })),
    deploymentVerified: false,
  };
  await writeFile(
    path.join(output, "build-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return { output, files: Object.keys(files), manifest };
}

async function main() {
  const { values } = parseArgs({
    options: {
      config: { type: "string" },
      "out-dir": { type: "string" },
      "ads-enabled": { type: "string" },
      updated: { type: "string" },
      help: { type: "boolean" },
    },
    strict: true,
    allowPositionals: false,
  });
  if (values.help) {
    console.log(
      "Build self-contained EN/TR publisher pages without deploying.\nUsage: VITE_ADS_ENABLED=false node scripts/build-public-pages.mjs [--config path] [--out-dir path] [--updated YYYY-MM-DD]\nPublisher fields: name, supportEmail, websiteUrl, privacyUrl, supportUrl; optional actual termsUrl.\nAll required identity fields and HTTPS URLs must be supplied. No placeholder public pages are emitted.",
    );
    return;
  }
  const result = await buildPublicPages({
    configPath: values.config,
    outDir: values["out-dir"],
    adsEnabled: values["ads-enabled"],
    updated: values.updated,
  });
  console.log(
    `Built ${result.files.length} self-contained bilingual HTML pages at ${result.output}.`,
  );
  console.log(
    "Local generation only: URLs, hosting, publisher review and deployment have not been verified.",
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
