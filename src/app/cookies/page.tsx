import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/content/legal-page";

export const metadata: Metadata = {
  title: "Cookies",
  description: "The Duratek website uses no advertising or analytics cookies. What it keeps on your device, and why.",
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies" updated="4 November 2026">
      <p>
        This website doesn&rsquo;t use advertising or analytics cookies, and doesn&rsquo;t track you across other
        sites. That&rsquo;s why there&rsquo;s no cookie banner.
      </p>

      <h2>What We Keep on Your Device</h2>
      <p>To remember the choices you make, the site keeps two small items in your browser&rsquo;s own storage:</p>
      <ul>
        <li>
          <strong>Your sample choices</strong>, so the finishes you pick stay in your sample tray as you browse.
        </li>
        <li>
          <strong>Your saved finishes</strong>, so you can come back to them and compare them.
        </li>
      </ul>
      <p>
        Both stay on your device. Nothing is sent to us until you request samples. Clearing your browser&rsquo;s site
        data removes them.
      </p>

      <h2>More About Your Data</h2>
      <p>
        Our <Link href="/privacy">privacy notice</Link> explains what we collect when you order samples or apply for a
        trade account.
      </p>
    </LegalPage>
  );
}
