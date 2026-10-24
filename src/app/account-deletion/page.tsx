import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/site";

export const metadata: Metadata = {
  title: "Delete your account",
  description: "How to delete your TTT account and what data is removed.",
  alternates: { canonical: "/account-deletion" },
};

export default function AccountDeletionPage() {
  return (
    <ContentPage title="Delete your TTT account" updated={POLICY_UPDATED}>
      <p>
        You can delete your TTT (TV Time Tracker) account and its data at any time, from the Android app or the website.
      </p>

      <h2>Delete it yourself (instant)</h2>
      <ol>
        <li>Open the TTT app or go to <Link href="/login">tvtime.online</Link> and sign in.</li>
        <li>Go to <strong>Profile</strong>.</li>
        <li>Scroll down and tap <strong>Delete Account</strong>.</li>
        <li>Confirm. Your account is deleted immediately.</li>
      </ol>

      <h2>Can&apos;t sign in?</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20TTT%20account`}>{CONTACT_EMAIL}</a> from the email address
        on your account with the subject &quot;Delete my TTT account&quot;. We&apos;ll delete it within 30 days and confirm by
        email.
      </p>

      <h2>What is deleted</h2>
      <ul>
        <li>Your account and sign-in details (email address, password or Google sign-in link).</li>
        <li>Your tracked shows and movies, watch history, ratings, reviews, comments and reactions, favorites, lists, badges and streaks.</li>
        <li>Your preferences, notification settings and push notification tokens.</li>
      </ul>

      <h2>What is kept, and for how long</h2>
      <ul>
        <li>A minimal deletion record (account ID, email and date) to confirm the deletion and prevent abuse, kept for up to 90 days.</li>
        <li>Server logs and backups held by our hosting providers, which are removed on their standard schedules (typically within 30 days).</li>
        <li>Aggregated, anonymous usage statistics that can no longer be linked to you.</li>
      </ul>

      <h2>Delete some data without deleting your account</h2>
      <p>
        You can remove individual shows or movies, unmark watched episodes, and delete your comments or reviews at any time
        from the app. For other requests, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </ContentPage>
  );
}
