export interface PublisherDetails {
  name: string;
  supportEmail: string;
  websiteUrl: string;
  privacyUrl: string;
  supportUrl: string;
  termsUrl?: string;
}

export interface PageSection {
  title: string;
  paragraphs: string[];
  links?: { href: string; label: string }[];
}

export interface PageCopy {
  title: string;
  titleTr: string;
  en: PageSection[];
  tr: PageSection[];
}

export type PublicPage = "privacy" | "terms" | "support";

export function pageCopy(
  page: PublicPage,
  publisher: PublisherDetails,
  adsEnabled: boolean,
): PageCopy;
