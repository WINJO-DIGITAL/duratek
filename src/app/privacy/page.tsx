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

      <h2>Who We Are</h2>
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

      <h2>When You Order Free Samples</h2>
      <p>
        We ask for your name, email address, postal address and, if you choose, a phone number, along with the
        finishes you chose. We use them to post your samples, email you a confirmation and, if the courier needs it,
        call you. You can also tick a box to receive occasional news from Duratek. That box is unticked unless you
        tick it, and you can unsubscribe at any time.
      </p>

      <h2>When You Apply for a Trade Account</h2>
      <p>
        We ask for your company name, your name, email address, phone number and type of trade, and you choose a
        password. We use these to check your application, run your trade account and contact you about it. Your
        password is stored in a scrambled (hashed) form by our account provider; nobody can read it, including us.
      </p>

      <h2>When You Send an Enquiry</h2>
      <p>
        If you write to us or ask a stockist a question, we ask for your name, email address and message, and, if you
        choose, your phone number and postcode. We use them to reply. We only pass your message to a stockist if you
        tick the box that says we may, and we keep a record of that choice and the words you agreed to. Stockists are
        independent businesses that handle what you send them under their own privacy notices. We don&rsquo;t say
        whether a stockist has a product in stock; please check with them.
      </p>

      <h2>When You View a Finish</h2>
      <p>
        We count how many times each finish page is viewed, as a daily total. We don&rsquo;t record who viewed it,
        your address or anything from your device, and we don&rsquo;t count visits from browsers that send Do Not
        Track or Global Privacy Control.
      </p>

      <h2>When You Search by Postcode</h2>
      <p>
        To find stockists near you, the postcode you enter is sent to{" "}
        <a href="https://postcodes.io" rel="noopener">
          postcodes.io
        </a>
        , a free UK postcode service, to look up its location. We don&rsquo;t store your search.
      </p>

      <h2>On Your Device</h2>
      <p>
        Your sample choices and saved finishes are kept in your browser&rsquo;s storage on your own device. They
        aren&rsquo;t sent to us until you request samples. See <Link href="/cookies">Cookies</Link> for details.
      </p>

      <h2>Who Handles Your Data for Us</h2>
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

      <h2>How Long We Keep It</h2>
      {/* Keep in step with the retention settings in admin (Settings), and the defaults in the migration. */}
      <ul>
        <li>Sample requests and enquiries: 24 months, then your name, contact and address details are removed.</li>
        <li>Rejected trade applications: 12 months after the decision, then deleted.</li>
        <li>Emails we have sent, as a log: 90 days.</li>
        <li>Records of what you agreed to: kept as evidence, with your email address removed if you ask us to delete your data.</li>
        <li>Trade accounts: until you or we close them. You can delete your account yourself from Settings.</li>
      </ul>

      <h2>Your Rights</h2>
      <p>
        Under UK data protection law you can ask for a copy of your data, ask us to correct or delete it, object to how
        we use it, and withdraw consent to marketing at any time. You can ask at{" "}
        <Link href="/privacy/request">our privacy request page</Link>, and we&rsquo;ll reply within one month after checking it&rsquo;s you.
        If you&rsquo;re unhappy with how we&rsquo;ve handled
        your data, you can complain to the{" "}
        <a href="https://ico.org.uk/make-a-complaint/" rel="noopener">
          Information Commissioner&rsquo;s Office
        </a>
        .
      </p>
    </LegalPage>
  );
}
