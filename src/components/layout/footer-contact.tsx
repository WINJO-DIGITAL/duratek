import type { ComponentType } from "react";
import { Facebook, Instagram, LinkedIn, Pinterest, YouTube } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  CONTACT_LOCATIONS,
  GENERAL_CONTACT,
  SOCIAL_LABELS,
  SOCIAL_PROFILES,
  telHref,
  type ContactLocation,
  type SocialNetwork,
  type SocialProfile,
} from "@/lib/contact";

const SOCIAL_ICONS: Record<SocialNetwork, ComponentType<{ size?: number }>> = {
  facebook: Facebook,
  instagram: Instagram,
  pinterest: Pinterest,
  linkedin: LinkedIn,
  youtube: YouTube,
};

const linkClass =
  "inline-flex min-h-tap items-center text-on-dark underline decoration-white/0 underline-offset-[6px] transition-[text-decoration-color] duration-300 hover:decoration-white/60";

/** Phone and email as "T" / "E" rows. */
function PhoneEmail({ phone, email }: { phone?: string; email?: string }) {
  if (!phone && !email) return null;
  return (
    <dl className="grid grid-cols-[1.5rem_1fr] items-center text-[0.9375rem]">
      {phone && (
        <>
          <dt className="text-on-dark-muted">
            T<span className="sr-only">elephone</span>
          </dt>
          <dd>
            <a href={telHref(phone)} className={cn(linkClass, "tabular-nums")}>
              {phone}
            </a>
          </dd>
        </>
      )}
      {email && (
        <>
          <dt className="text-on-dark-muted">
            E<span className="sr-only">mail</span>
          </dt>
          <dd className="min-w-0">
            <a href={`mailto:${email}`} className={cn(linkClass, "break-all")}>
              {email}
            </a>
          </dd>
        </>
      )}
    </dl>
  );
}

function Location({ loc }: { loc: ContactLocation }) {
  return (
    <div>
      <h3 className="text-[0.8125rem] font-medium uppercase leading-snug tracking-[0.12em] text-on-dark">{loc.name}</h3>
      {loc.note && (
        <p className="mt-1 text-[0.8125rem] uppercase tracking-[0.12em] text-on-dark-muted">{loc.note}</p>
      )}
      <address className="mt-4 text-[0.9375rem] not-italic leading-relaxed text-on-dark">
        {loc.address.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </address>
      <div className="mt-3">
        <PhoneEmail phone={loc.phone} email={loc.email} />
      </div>
      {loc.hours && loc.hours.length > 0 && (
        <dl className="mt-3 space-y-1.5 text-[0.9375rem] leading-relaxed">
          {loc.hours.map((h) => (
            <div key={h.days}>
              <dt className="text-on-dark-muted">{h.days}</dt>
              <dd className="text-on-dark">{h.time}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/**
 * "Say hello" (main phone and email, then each location with its hours)
 * and "Stay in touch" (social profiles), on navy at the foot of every page.
 * Each part renders only once the client's details are entered in
 * src/lib/contact.ts; with none, the whole block is omitted.
 */
export function FooterContact({
  general = GENERAL_CONTACT,
  locations = CONTACT_LOCATIONS,
  social = SOCIAL_PROFILES,
}: {
  general?: { phone?: string; email?: string };
  locations?: ContactLocation[];
  social?: SocialProfile[];
}) {
  const hasGeneral = Boolean(general.phone || general.email);
  const hasHello = hasGeneral || locations.length > 0;
  if (!hasHello && social.length === 0) return null;

  return (
    <section aria-label="Contact" className="border-t border-white/10">
      <div className="container-page grid gap-x-10 gap-y-12 py-section-sm lg:grid-cols-[3fr_1fr]">
        {hasHello && (
          <div>
            <h2 className="eyebrow font-sans text-green-on-navy">Say Hello</h2>
            <div className="mt-5 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {hasGeneral && (
                <div>
                  <PhoneEmail phone={general.phone} email={general.email} />
                </div>
              )}
              {locations.map((loc) => (
                <Location key={loc.name} loc={loc} />
              ))}
            </div>
          </div>
        )}

        {social.length > 0 && (
          <div>
            <h2 className="eyebrow font-sans text-green-on-navy">Stay in Touch</h2>
            <ul className="mt-3">
              {social.map(({ network, url }) => {
                const IconC = SOCIAL_ICONS[network];
                return (
                  <li key={network}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex min-h-tap items-center gap-3 text-[0.9375rem] text-on-dark-muted transition-colors duration-300 hover:text-white"
                    >
                      <span className="text-green-on-navy transition-colors duration-300 group-hover:text-white">
                        <IconC size={20} />
                      </span>
                      {SOCIAL_LABELS[network]}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
