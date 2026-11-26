# Standalone publisher pages

This source generates self-contained, bilingual English/Turkish privacy, support, and terms pages. It does not deploy, register a domain, verify ownership, or prove that any configured URL is live.

The publisher must supply the real public values in `src/config/publisher.json`:

- `name`
- `supportEmail`
- `websiteUrl`
- `privacyUrl`
- `supportUrl`

An actual `termsUrl` is optional for this generator. No terms URL is inferred from a domain or pathname. Without that field, the terms file has no canonical URL or public navigation link; it can be hosted at a publisher-selected address later. The generator shares the app’s publisher validation rules; website, privacy and support addresses must identify their respective pages. Required URLs must be HTTPS addresses without embedded credentials or fragments. Empty values, recognized placeholders, reserved example domains, and local-only hosts are rejected.

```sh
VITE_ADS_ENABLED=false node scripts/build-public-pages.mjs
```

Use `true` only for the actual advertising-enabled edition. There is no default advertising mode: the environment variable or `--ads-enabled true|false` must explicitly choose one. The ad-free pages omit the conditional Google-processing disclosure; ad-enabled pages explain optional ads, UMP permission, nonpersonalized requests, Google processing, and nonblocking availability. Neither variant creates an advertising request.

Optional flags:

```sh
node scripts/build-public-pages.mjs \
  --config /absolute/path/to/publisher.json \
  --out-dir /absolute/path/to/output \
  --ads-enabled false \
  --updated 2026-11-26
```

The default output is ignored `artifacts/legal-site/`. Output consists of `index.html`, `privacy.html`, `support.html`, `terms.html`, and `build-manifest.json`. Each HTML file includes its own CSS, both language sections, a contact email, a date, and only configured publisher links; it needs no scripts, external fonts, cookies or external stylesheet. The manifest maps files to the supplied canonical URLs and explicitly records `deploymentVerified: false`.

The local filenames do not guess your hosting routes. Upload `privacy.html` so it is served at the exact configured `privacyUrl`, and `support.html` at `supportUrl`; configure the host's routes/filenames as needed. The optional `index.html` is a publisher information page for `websiteUrl`. A website already hosted elsewhere need not be replaced. Before publication, the publisher must review the texts, establish rights/contact arrangements and any jurisdiction-specific disclosures, host the selected pages over public HTTPS, and verify their actual responses. No publication workflow is activated here.

Invalid publisher configuration fails before writing public files. Existing unrelated output folders are preserved. A repeat build can update a folder containing only this generator's files and its matching manifest. Do not put hand-edited files in the generated folder; edit the source instead.

The Markdown documents under `docs/` remain publisher-review templates until the real configuration is supplied. Their identity tokens are `{{PUBLISHER_NAME}}`, `{{SUPPORT_EMAIL}}`, `{{WEBSITE_URL}}`, `{{PRIVACY_URL}}`, and `{{SUPPORT_URL}}`; the three `ADS_*_SECTION` tokens identify edition-specific sections for editorial review. Both the actual in-app legal renderer and the website generator use structured copy in `site/content.mjs` with the configured publisher and advertising mode, rather than displaying unresolved Markdown templates. Review both sources together when data practices change. English/Turkish legal copy still needs publisher/legal review; a successful local build does not establish legal sufficiency, native SDK data practices, website availability, or store approval.

Run the generator regression tests with `node --test site/build-public-pages.test.mjs`. They create fixture identities and outputs only in fresh `/tmp` directories, make no external requests, and clean up their own files. Fixtures are never a publisher configuration or a public deployment.
