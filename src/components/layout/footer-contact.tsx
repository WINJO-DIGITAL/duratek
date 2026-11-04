import type { ComponentType } from "react";
import { Facebook, Instagram, LinkedIn, Pinterest, YouTube } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import {
  CONTACT_LOCATIONS,
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

/**
 * Locations (address, phone, email, opening hours) and social profiles,
 * on navy at the foot of every page. Renders nothing until the client's
 * details are entered in src/lib/contact.ts.
 */
export function FooterContact({
  locations = CONTACT_LOCATIONS,
  social = SOCIAL_PROFILES,
}: {
  locations?: ContactLocation[];
  social?: SocialProfile[];
}) {
  if (locations.length === 0 && social.length === 0) return null;

  return (
    <section aria-label="Contact" className="border-t border-white/10">
      <div className="container-page grid gap-x-10 gap-y-12 py-section-sm sm:grid-cols-2 lg:grid-cols-4">
        {locations.map((loc) => (
          <div key={loc.name}>
            <h2 className="eyebrow font-sans text-green-on-navy">{loc.name}</h2>
            <address className="mt-5 text-[0.9375rem] not-italic leading-relaxed text-on-dark">
              {loc.address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>

            {(loc.phone || loc.email) && (
              <dl className="mt-4 grid grid-cols-[1.5rem_1fr] items-center text-[0.9375rem]">
                {loc.phone && (
                  <>
                    <dt className="text-on-dark-muted">
                      T<span className="sr-only">elephone</span>
                    </dt>
                    <dd>
                      <a href={telHref(loc.phone)} className={cn(linkClass, "tabular-nums")}>
                        {loc.phone}
                      </a>
                    </dd>
                  </>
                )}
                {loc.email && (
                  <>
                    <dt className="text-on-dark-muted">
                      E<span className="sr-only">mail</span>
                    </dt>
                    <dd className="min-w-0">
                      <a href={`mailto:${loc.email}`} className={cn(linkClass, "break-all")}>
                        {loc.email}
                      </a>
                    </dd>
                  </>
                )}
              </dl>
            )}

            {loc.hours && loc.hours.length > 0 && (
              <dl className="mt-4 space-y-1.5 text-[0.9375rem] leading-relaxed">
                {loc.hours.map((h) => (
                  <div key={h.days}>
                    <dt className="text-on-dark-muted">{h.days}</dt>
                    <dd className="text-on-dark">{h.time}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}

        {social.length > 0 && (
          <div className={cn(locations.length > 0 && "lg:col-start-4")}>
            <h2 className="eyebrow font-sans text-green-on-navy">Stay in touch</h2>
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
