import type { Metadata } from "next";
import ContentPage from "@/components/ContentPage";
import { CONTACT_EMAIL, POLICY_UPDATED, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses and protects your information, including cookies and advertising.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <ContentPage title="Privacy Policy" updated={POLICY_UPDATED}>
      <p>
        This policy explains what information {SITE_NAME} (&quot;we&quot;, &quot;us&quot;) collects when you use{" "}
        <a href={SITE_URL}>{SITE_URL.replace(/^https?:\/\//, "")}</a>, how we use it, and the choices you have.
      </p>

      <h2>Information you give us</h2>
      <ul>
        <li><strong>Account details:</strong> your email address and password (passwords are stored securely by our authentication provider and are never visible to us), and an optional display name.</li>
        <li><strong>Tracking data:</strong> the shows and movies you track, episodes you mark as watched, ratings, reviews, favorites, emotions, badges and preferences such as your country.</li>
        <li><strong>Community content:</strong> comments and reactions you post. Comments and your display name are visible to other visitors. Your email address is never shown.</li>
        <li><strong>Imports:</strong> if you upload a TV Time data export, it is processed in your browser and only the resulting watch history, ratings and similar data are saved to your account.</li>
        <li><strong>Feedback:</strong> messages you send through the feedback or contact form.</li>
      </ul>

      <h2>Information collected automatically</h2>
      <ul>
        <li><strong>Usage analytics:</strong> pages visited and in-app actions (for example, marking an episode watched) so we can understand which features are used. We use Vercel Analytics and PostHog for this.</li>
        <li><strong>Performance data:</strong> page load timings via Vercel Speed Insights.</li>
        <li><strong>Technical data:</strong> IP address, browser type and device information, which our hosting provider records in standard server logs and uses for security and rate limiting.</li>
        <li><strong>Local storage:</strong> we store small items in your browser (such as your login session and dismissed prompts) so the app works and remembers your choices.</li>
      </ul>

      <h2>Advertising and cookies</h2>
      <p>
        We use Google AdSense to show ads. Third-party vendors, including Google, use cookies to serve ads based on your prior
        visits to this website or other websites. Google&apos;s use of advertising cookies enables it and its partners to serve
        ads to you based on your visits to this site and/or other sites on the Internet.
      </p>
      <p>
        You may opt out of personalized advertising by visiting{" "}
        <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>. You can also
        opt out of some third-party vendors&apos; use of cookies for personalized advertising at{" "}
        <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info</a>. Learn more about{" "}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
          how Google uses information from sites that use its services
        </a>
        .
      </p>
      <p>Users in the EEA, UK and Switzerland may be asked for consent before personalized ads are shown.</p>

      <h2>How we use your information</h2>
      <ul>
        <li>To run your account and show your progress, upcoming episodes, stats, streaks and badges.</li>
        <li>To send notifications you turn on (email digests or push notifications about new episodes). You can turn these off anytime in your profile.</li>
        <li>To generate recommendations, including AI suggestions. The text of your request and the titles you recently watched are sent to our AI provider to produce suggestions.</li>
        <li>To keep the service secure, prevent abuse and fix bugs.</li>
        <li>To improve the product using aggregated usage analytics.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>Service providers</h2>
      <p>We share information only with providers that help us run the service:</p>
      <ul>
        <li><strong>Supabase:</strong> database and authentication.</li>
        <li><strong>Vercel:</strong> hosting, analytics and performance monitoring.</li>
        <li><strong>PostHog:</strong> product analytics.</li>
        <li><strong>Resend:</strong> sending emails.</li>
        <li><strong>Groq:</strong> generating AI recommendations.</li>
        <li><strong>Google AdSense:</strong> advertising.</li>
        <li><strong>TMDB:</strong> show and movie information. We request titles and images from TMDB; your personal data is not sent to TMDB.</li>
      </ul>

      <h2>Data retention and deletion</h2>
      <p>
        We keep your data while your account is active. You can delete your account at any time from{" "}
        <strong>Profile → Delete Account</strong>, which permanently removes your account and associated data (watch history,
        tracked shows, ratings, comments, favorites, badges, preferences and notification settings). Server logs and backups
        are deleted on our providers&apos; standard schedules.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, export or delete your personal data, and to
        object to or restrict certain processing. To make a request, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Children</h2>
      <p>
        {SITE_NAME} is not directed to children under 13, and we do not knowingly collect personal information from them. If
        you believe a child has created an account, contact us and we will delete it.
      </p>

      <h2>Security</h2>
      <p>
        Data is transmitted over HTTPS and access to each user&apos;s data is restricted to that user. No method of
        transmission or storage is completely secure, but we work to protect your information.
      </p>

      <h2>Changes to this policy</h2>
      <p>We may update this policy from time to time. The &quot;Last updated&quot; date above shows when it last changed.</p>

      <h2>Contact</h2>
      <p>
        Questions about this policy? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </ContentPage>
  );
}
