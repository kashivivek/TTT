import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { CONTACT_EMAIL, MIN_AGE, POLICY_UPDATED, SITE_NAME } from "@/lib/site";

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
        <li>You must be at least {MIN_AGE} years old to use the Service. By creating an account you confirm that you meet this age requirement.</li>
        <li>You are responsible for keeping your password secure and for all activity on your account.</li>
        <li>You can delete your account at any time from your profile.</li>
      </ul>

      <h2>Your responsibility for your content and conduct</h2>
      <p>
        {SITE_NAME} is a platform that hosts content created by its users. <strong>You are solely responsible</strong> for
        everything you post (including comments, reviews, ratings, display names and lists), for your interactions with other
        users, and for complying with all laws that apply to you. We do not review content before it is posted and we are not
        responsible for content posted by users. Any legal, civil or criminal liability arising from your content or conduct
        is yours alone and not that of {SITE_NAME} or its developer, to the fullest extent permitted by law.
      </p>
      <p>
        You agree to indemnify and hold harmless {SITE_NAME} and its developer from any claims, damages or costs (including
        reasonable legal fees) arising from your content, your use of the Service, or your violation of these terms or of
        any law or third-party right.
      </p>

      <h2>Community guidelines</h2>
      <p>When posting comments or reviews, do not:</p>
      <ul>
        <li>Post anything illegal, hateful, harassing, sexually explicit or threatening.</li>
        <li>Spam, advertise, or impersonate others.</li>
        <li>Post major spoilers without marking them as spoilers.</li>
        <li>Share other people&apos;s personal information.</li>
      </ul>
      <p>
        You keep ownership of what you post, but you give us a worldwide, non-exclusive, royalty-free license to host, display
        and distribute it within the Service. We may remove content or suspend or terminate accounts that break these rules,
        at our discretion and without notice. You can report a comment using the Report link.
      </p>
      <p>
        <strong>Illegal content.</strong> Using the Service to share illegal content or to plan or promote illegal activity is
        strictly prohibited. We may preserve such content and related account information and report it to law enforcement
        or other authorities where required or appropriate. To report illegal content or a copyright infringement, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with a link to the content and a description of the issue.
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

      <h2>Disclaimer and limitation of liability</h2>
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. We do not guarantee that it
        will always be available, error-free, or that data (including imported history) will be preserved. Streaming links
        and availability come from third parties and may be inaccurate. To the fullest extent permitted by law, {SITE_NAME}
        and its developer are not liable for any indirect, incidental, special or consequential damages, or for any content
        or conduct of users or third parties, and our total liability for any claim is limited to USD 50.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time. We may suspend or end access to the Service, or
        change or discontinue features, at any time.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. When we make important changes we will ask you to accept the updated terms the next time you
        use the Service. See also our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </ContentPage>
  );
}
