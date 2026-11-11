import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/content/legal-page";
import { WarrantyDisclaimer } from "@/components/content/warranty";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms that apply when you use the Duratek website, order samples or request a quote.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="11 November 2026">
      <p>
        These terms apply to your use of the Duratek website. By using the site you agree to them. If you do not agree,
        please do not use the site.
      </p>

      <h2>About the website</h2>
      <p>
        The website gives information about Duratek waterproof SPC click flooring: the finishes, their specifications,
        where to find a stockist, and how to request free samples. It is for information only. Nothing on the site is an
        offer to sell, and the site does not take orders or payment.
      </p>

      <h2>Accuracy of information</h2>
      <p>
        We take care to keep product information accurate and up to date. Colours and grain are shown as photographed on
        screen, and screens vary, so a sample is the best guide to a finish. Specifications may change; the data sheet
        for the product you are buying is the one that applies. Where a finish has no recommended retail price shown,
        ask a stockist for a price.
      </p>

      <h2>Prices</h2>
      <p>
        Recommended retail prices (RRP) are shown per square metre including VAT. Stockists set their own prices, and
        they may differ from the RRP. Trade prices are not shown on this website. They are available only to approved
        trade accounts, under the trade terms agreed when the account is approved.
      </p>

      <h2>Free samples</h2>
      <p>
        Samples are free. You may request up to three per request, and they are sent while stocks last. We may decline a
        request or ask for more detail, for example to confirm an address. A finish that is out of stock as a sample
        will be marked on the site.
      </p>

      <h2>Warranty</h2>
      <p>
        Warranty terms, including what is and is not covered and for how long, are set out on our{" "}
        <Link href="/warranty">warranty page</Link>. The residential and commercial warranties described there apply only
        in the conditions stated.
      </p>
      <WarrantyDisclaimer />

      <h2>Trade quotations</h2>
      <p>
        Quotes that trade customers create with the trade tools are the trader&rsquo;s own quotes to their customers.
        Duratek is not a party to them and does not sell through them. The trader is responsible for the prices, terms
        and advice in any quote they send.
      </p>

      <h2>Content and intellectual property</h2>
      <p>
        The text, photographs, graphics and logos on this site belong to Duratek or are used with permission. You may view
        and print pages for your own use. Please do not copy them for commercial use without written permission.
      </p>

      <h2>Links to other sites</h2>
      <p>
        The site links to other websites, including online retailers. We do not control those sites and are not
        responsible for their content or their terms.
      </p>

      <h2>Limits of responsibility</h2>
      <p>
        We do not exclude liability that cannot be excluded by law, such as liability for death or personal injury caused
        by our negligence, or for fraud. Subject to that, we are not liable for loss arising from reliance on information on
        this site, or from the actions of third parties, including stockists and online retailers.
      </p>

      <h2>Your personal data</h2>
      <p>
        How we handle personal data is set out in our <Link href="/privacy">privacy notice</Link>. Cookies are described on
        our <Link href="/cookies">cookies page</Link>.
      </p>

      <h2>Changes and governing law</h2>
      <p>
        We may change these terms or the site at any time. The version on this page applies from the date shown above.
        These terms are governed by the law of England and Wales, and the courts of England and Wales have jurisdiction.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent through our <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
