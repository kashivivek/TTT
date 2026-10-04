import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { CONTACT_EMAIL, POLICY_UPDATED, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms for using ${SITE_NAME}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <ContentPage title="Terms of Service" updated={POLICY_UPDATED}>
      <p>
        By creating an account or using {SITE_NAME} (the &quot;Service&quot;), you agree to these terms. If you do not agree,
        please do not use the Service.
      </p>

      <h2>The Service</h2>
      <p>
        {SITE_NAME} lets you track TV shows and movies, see where to watch them, get notified about new episodes, and share
        comments with other viewers. The Service is provided free of charge and is supported by advertising.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 13 years old to use the Service.</li>
        <li>You are responsible for keeping your password secure and for activity on your account.</li>
        <li>You can delete your account at any time from your profile.</li>
      </ul>

      <h2>Community guidelines</h2>
      <p>When posting comments or reviews, do not:</p>
      <ul>
        <li>Post anything illegal, hateful, harassing, sexually explicit or threatening.</li>
        <li>Spam, advertise, or impersonate others.</li>
        <li>Post major spoilers without marking them as spoilers.</li>
        <li>Share other people&apos;s personal information.</li>
      </ul>
      <p>
        You keep ownership of what you post, but you give us permission to display it within the Service. We may remove
        content or suspend accounts that break these rules. You can report a comment using the Report link.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Do not attempt to disrupt the Service, access other users&apos; data, scrape the Service at scale, or bypass rate limits
        or security measures.
      </p>

      <h2>Third-party content</h2>
      <p>
        Show and movie information and images are provided by TMDB. This product uses the TMDB API but is not endorsed or
        certified by TMDB. Streaming availability is provided for information only and may be out of date. {SITE_NAME} is an
        independent project and is not affiliated with TV Time or Whip Media.
      </p>

      <h2>Disclaimer</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that it will always be
        available, error-free, or that data (including imported history) will be preserved. To the fullest extent permitted by
        law, we are not liable for any indirect or consequential damages arising from your use of the Service.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. Continued use after changes means you accept the updated terms. See also our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </ContentPage>
  );
}
