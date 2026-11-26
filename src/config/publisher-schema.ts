export interface Publisher {
  name: string;
  supportEmail: string;
  websiteUrl: string;
  privacyUrl: string;
  supportUrl: string;
}

const fields = [
  "name",
  "supportEmail",
  "websiteUrl",
  "privacyUrl",
  "supportUrl",
] as const;
const placeholder =
  /\{\{|\}\}|\[\s*required|^(?:todo|tbd|changeme|change_me|replace_me|your name|publisher name)$/i;

function publicHost(host: string): boolean {
  return (
    host.includes(".") &&
    !host.endsWith(".") &&
    !["example.com", "example.org", "example.net", "localhost"].some(
      (reserved) => host === reserved || host.endsWith(`.${reserved}`),
    ) &&
    !/\.(?:test|invalid|example|localhost|local|internal)$/.test(host) &&
    !/^\d+(?:\.\d+){3}$/.test(host) &&
    !host.includes(":")
  );
}

export function publicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      publicHost(url.hostname.toLowerCase()) &&
      !placeholder.test(value)
    );
  } catch {
    return false;
  }
}

/** Public identity only; never store signing keys or account credentials here. */
export function validatePublisher(input: unknown): {
  publisher: Publisher;
  issues: string[];
} {
  const record =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const publisher = {} as Publisher;
  const issues: string[] = [];
  for (const field of fields) {
    const value = typeof record[field] === "string" ? record[field].trim() : "";
    const limit =
      field === "name" ? 200 : field === "supportEmail" ? 254 : 2048;
    if (
      !value ||
      value.length > limit ||
      [...value].some(
        (character) =>
          character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ) ||
      placeholder.test(value)
    ) {
      issues.push(`${field}: supply the real public publisher value.`);
      publisher[field] = "";
    } else publisher[field] = value;
  }
  const email = /^[^\s@<>]+@([^\s@<>]+\.[^\s@<>]+)$/.exec(
    publisher.supportEmail,
  );
  if (!email || !publicHost(email[1].toLowerCase())) {
    issues.push("supportEmail: a valid public email address is required.");
    publisher.supportEmail = "";
  }
  for (const field of ["websiteUrl", "privacyUrl", "supportUrl"] as const) {
    if (!publicHttpsUrl(publisher[field])) {
      issues.push(
        `${field}: an actual public HTTPS URL without credentials or fragments is required.`,
      );
      publisher[field] = "";
    } else publisher[field] = new URL(publisher[field]).href;
  }
  const urls = [
    publisher.websiteUrl,
    publisher.privacyUrl,
    publisher.supportUrl,
  ].filter(Boolean);
  if (new Set(urls).size !== urls.length)
    issues.push(
      "Public website, privacy and support URLs must identify their respective pages.",
    );
  return { publisher, issues: [...new Set(issues)] };
}
