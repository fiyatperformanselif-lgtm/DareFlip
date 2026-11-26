import { describe, expect, it } from "vitest";
import { validatePublisher } from "./publisher-schema";

// Synthetic fixtures exercise validation; they are never written as publisher identity.
const valid = {
  name: "Publisher Fixture",
  supportEmail: "support@fixture-publisher.dev",
  websiteUrl: "https://fixture-publisher.dev/",
  privacyUrl: "https://fixture-publisher.dev/privacy",
  supportUrl: "https://fixture-publisher.dev/support",
};

describe("public publisher configuration", () => {
  it("accepts explicit identity and distinct public HTTPS page addresses", () => {
    expect(validatePublisher(valid)).toEqual({ publisher: valid, issues: [] });
  });
  it("rejects missing, example and placeholder identity rather than inventing values", () => {
    for (const input of [
      null,
      {},
      { ...valid, name: "{{PUBLISHER_NAME}}" },
      { ...valid, supportEmail: "support@example.com" },
    ])
      expect(validatePublisher(input).issues.length).toBeGreaterThan(0);
  });
  it("rejects unsafe URLs and mail header injection", () => {
    for (const url of [
      "http://fixture-publisher.dev/",
      "javascript:alert(1)",
      "https://localhost/privacy",
      "https://user:pass@fixture-publisher.dev/privacy",
      "https://fixture-publisher.dev/privacy#fragment",
    ]) {
      const result = validatePublisher({ ...valid, privacyUrl: url });
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.publisher.privacyUrl).toBe("");
    }
    expect(
      validatePublisher({
        ...valid,
        supportEmail:
          "user@fixture-publisher.dev\r\nBcc:other@fixture-publisher.dev",
      }).publisher.supportEmail,
    ).toBe("");
  });
  it("does not describe one generic page as all three public resources", () => {
    expect(
      validatePublisher({ ...valid, supportUrl: valid.privacyUrl }).issues,
    ).not.toEqual([]);
    expect(
      validatePublisher({
        ...valid,
        websiteUrl: "https://fixture-publisher.dev",
        privacyUrl: "https://fixture-publisher.dev/",
        supportUrl: "https://fixture-publisher.dev:443/",
      }).issues,
    ).not.toEqual([]);
  });
  it("rejects reserved domains disguised with a terminal DNS dot", () => {
    expect(
      validatePublisher({
        ...valid,
        supportEmail: "help@example.com.",
        privacyUrl: "https://example.com./privacy",
      }).issues,
    ).not.toEqual([]);
  });
  it("keeps a valid support contact usable while other publisher details are pending", () => {
    const result = validatePublisher({
      ...valid,
      websiteUrl: "",
      privacyUrl: "",
      supportUrl: "",
    });
    expect(result.issues).not.toEqual([]);
    expect(result.publisher.name).toBe(valid.name);
    expect(result.publisher.supportEmail).toBe(valid.supportEmail);
    expect(result.publisher.websiteUrl).toBe("");
    expect(result.publisher.privacyUrl).toBe("");
  });
});
