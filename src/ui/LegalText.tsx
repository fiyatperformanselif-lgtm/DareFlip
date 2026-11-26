import { pageCopy } from "../../site/content.mjs";
import { publicHttpsUrl, type Publisher } from "../config/publisher-schema";

export function LegalText({
  page,
  language,
  publisher,
  adsEnabled,
}: {
  page: "privacy" | "terms";
  language: "en" | "tr";
  publisher: Publisher;
  adsEnabled: boolean;
}) {
  const missing =
    language === "tr" ? "Henüz yapılandırılmadı" : "Not configured yet";
  const display = {
    ...publisher,
    name: publisher.name || missing,
    supportEmail: publisher.supportEmail || missing,
  };
  const copy = pageCopy(page, display, adsEnabled);
  return (
    <div className="legal-text" lang={language} dir="ltr">
      {copy[language].map((section) => (
        <section key={section.title}>
          <h3>{section.title}</h3>
          {section.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {section.links
            ?.filter((link) => publicHttpsUrl(link.href))
            .map((link) => (
              <p key={link.href}>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </p>
            ))}
        </section>
      ))}
    </div>
  );
}
