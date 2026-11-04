import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/content/legal-page";
import { COMPANY, GENERAL_CONTACT } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What personal data the Duratek website collects, why, who handles it and your rights.",
};

/**
 * Describes what the site actually does with personal data. Company identity
 * and contact details come from src/lib/contact.ts and appear once supplied.
 */
export default function PrivacyPage() {
  const controller = COMPANY.legalName ?? "Duratek";
  return (
    <LegalPage title="Privacy" updated="4 November 2026">
      <p>
        This notice explains what personal data this website collects, why, who handles it, and the choices you have.
        We collect only what we need to do what you ask.
      </p>

      <h2>Who we are</h2>
      <p>
        The website is run by {controller}
        {COMPANY.registeredOffice ? `, ${COMPANY.registeredOffice}` : ""}
        {COMPANY.registrationNumber ? ` (company number ${COMPANY.registrationNumber})` : ""}, which is responsible for
        your data.
        {GENERAL_CONTACT.email && (
          <>
            {" "}
            You can reach us at <a href={`mailto:${GENERAL_CONTACT.email}`}>{GENERAL_CONTACT.email}</a>.
          </>
        )}
      </p>

      <h2>When you order free samples</h2>
      <p>
        We ask for your name, email address, postal address and, if you choose, a phone number, along with the
        finishes you chose. We use them to post your samples, email you a confirmation and, if the courier needs it,
        call you. You can also tick a box to receive occasional news from Duratek. That box is unticked unless you
        tick it, and you can unsubscribe at any time.
      </p>

      <h2>When you apply for a trade account</h2>
      <p>
        We ask for your company name, your name, email address, phone number and type of trade, and you choose a
        password. We use these to check your application, run your trade account and contact you about it. Your
        password is stored in a scrambled (hashed) form by our account provider; nobody can read it, including us.
      </p>

      <h2>When you search by postcode</h2>
      <p>
        To find stockists near you, the postcode you enter is sent to{" "}
        <a href="https://postcodes.io" rel="noopener">
          postcodes.io
        </a>
        , a free UK postcode service, to look up its location. We don&rsquo;t store your search.
      </p>

      <h2>On your device</h2>
      <p>
        Your sample choices and saved finishes are kept in your browser&rsquo;s storage on your own device. They
        aren&rsquo;t sent to us until you request samples. See <Link href="/cookies">Cookies</Link> for details.
      </p>

      <h2>Who handles your data for us</h2>
      <ul>
        <li>
          <strong>Supabase</strong> stores sample requests and trade accounts.
        </li>
        <li>
          <strong>Resend</strong> sends our emails.
        </li>
        <li>
          <strong>Vercel</strong> hosts the website.
        </li>
      </ul>
      <p>They act on our instructions only. We don&rsquo;t sell your data or share it for advertising.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep sample requests and trade account details only for as long as we need them for the purposes above,
        and delete them when they&rsquo;re no longer needed.
      </p>

      <h2>Your rights</h2>
      <p>
        Under UK data protection law you can ask for a copy of your data, ask us to correct or delete it, object to how
        we use it, and withdraw consent to marketing at any time. If you&rsquo;re unhappy with how we&rsquo;ve handled
        your data, you can complain to the{" "}
        <a href="https://ico.org.uk/make-a-complaint/" rel="noopener">
          Information Commissioner&rsquo;s Office
        </a>
        .
      </p>
    </LegalPage>
  );
}
