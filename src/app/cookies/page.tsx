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
        sites. The notice at the foot of the page tells you what it does keep. Each item below is needed for the site to
        work, so none of them needs your consent.
      </p>

      <h2>What We Keep on Your Device</h2>
      <ul>
        <li>
          <strong>Your sample choices</strong>, so the finishes you pick stay in your sample tray as you browse. This
          stays in your browser&rsquo;s own storage until you request samples.
        </li>
        <li>
          <strong>Your saved finishes</strong>, so you can come back to them and compare them. This stays in your
          browser&rsquo;s own storage.
        </li>
        <li>
          <strong>Your cookie notice choice</strong>, so the notice doesn&rsquo;t return once you&rsquo;ve closed it.
          This stays in your browser&rsquo;s own storage.
        </li>
        <li>
          <strong>Trade sign-in and Customer view</strong>, if you log in to a trade account. A sign-in cookie keeps you
          logged in, and a Customer view cookie hides trade prices. Both are set only when you use them, and they end
          when you log out or close the browser.
        </li>
      </ul>
      <p>
        Clearing your browser&rsquo;s site data removes all of these. Nothing is sent to us until you request samples or
        sign in.
      </p>

      <h2>More About Your Data</h2>
      <p>
        Our <Link href="/privacy">privacy notice</Link> explains what we collect when you order samples or apply for a
        trade account.
      </p>
    </LegalPage>
  );
}
