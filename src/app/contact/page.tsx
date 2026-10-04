import type { Metadata } from "next";
import ContentPage from "@/components/ContentPage";
import ContactForm from "@/components/ContactForm";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${SITE_NAME} team: questions, bug reports, feature requests and privacy requests.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <ContentPage title="Contact">
      <p className="mt-6">
        Questions, bug reports, feature ideas or privacy requests? Send a message below or email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We usually reply within a few days.
      </p>
      <ContactForm />
      <h2>Account and privacy requests</h2>
      <p>
        You can delete your account yourself from <strong>Profile → Delete Account</strong>. For data access or export requests,
        email us from the address on your account.
      </p>
    </ContentPage>
  );
}
