import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="landing">
      <div className="lp-shell">
        <nav className="lp-nav" aria-label="Primary">
          <Link href="/" className="brand-link" aria-label="Cove home">
            <Logo size={34} />
          </Link>
          <div className="lp-nav-actions">
            <Link href="/login">Log in</Link>
            <Link href="/signup" className="btn">
              Get started
            </Link>
          </div>
        </nav>

        <section className="lp-hero" aria-labelledby="page-title">
          <div className="lp-hero-copy">
            <p className="eyebrow">Shared household calendar</p>
            <h1 id="page-title" className="lp-title">
              A calmer home, <em>together</em>.
            </h1>
            <p className="lp-lede">
              Cove keeps your household in sync — events, tasks, shopping, and
              the boring admin — so everyone knows what&apos;s happening without
              the group-chat chaos.
            </p>
            <div className="inline-actions">
              <Link href="/signup" className="btn">
                Get started — it&apos;s free
              </Link>
              <Link href="/login" className="btn btn-secondary">
                Log in
              </Link>
            </div>
            <div className="lp-trust">
              <span className="lp-avatars" aria-hidden>
                <span style={{ "--g": "#2c8b79" } as CSSProperties} />
                <span style={{ "--g": "#77c4b4" } as CSSProperties} />
                <span style={{ "--g": "#e6925d" } as CSSProperties} />
                <span style={{ "--g": "#5b9bd6" } as CSSProperties} />
              </span>
              <span>Built for the whole household — not just one organiser.</span>
            </div>
          </div>

          <div className="lp-art" aria-hidden>
            <ProductPeek />
          </div>
        </section>
      </div>

      <div className="lp-shell">
        <section className="lp-section" aria-labelledby="features-title">
          <div className="lp-section-head">
            <p className="eyebrow">One calm place</p>
            <h2 id="features-title">Everything the home shares, in one cove</h2>
            <p>
              Each part of running a home gets its own gentle space — and they
              all roll up into a single shared view.
            </p>
          </div>
          <div className="feature-grid">
            {features.map((f) => (
              <article className="feature-card" key={f.title}>
                <span className="f-ico">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-band" aria-labelledby="cta-title">
          <Logo variant="mark" size={56} idPrefix="band" />
          <h2 id="cta-title">Bring your household into the cove</h2>
          <p>
            Set up your home in a couple of minutes, invite the people you live
            with, and let the planning take care of itself.
          </p>
          <div className="inline-actions" style={{ justifyContent: "center" }}>
            <Link href="/signup" className="btn">
              Create your household
            </Link>
          </div>
        </section>

        <footer className="lp-foot">
          <Link href="/" className="brand-link" aria-label="Cove home">
            <Logo size={26} />
          </Link>
          <nav aria-label="Footer">
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
            <Link href="/password-reset">Reset password</Link>
          </nav>
          <span>© {new Date().getFullYear()} Cove</span>
        </footer>
      </div>
    </main>
  );
}

function ProductPeek() {
  const week = [
    { d: "M", n: 9 },
    { d: "T", n: 10 },
    { d: "W", n: 11, dot: true },
    { d: "T", n: 12 },
    { d: "F", n: 13, today: true, dot: true },
    { d: "S", n: 14 },
    { d: "S", n: 15 },
  ];

  return (
    <div className="peek">
      <div className="peek-top">
        <strong>This week</strong>
        <span className="peek-dots">
          <span style={{ "--g": "#2c8b79" } as CSSProperties} />
          <span style={{ "--g": "#77c4b4" } as CSSProperties} />
          <span style={{ "--g": "#e6925d" } as CSSProperties} />
        </span>
      </div>

      <div className="peek-week">
        {week.map((day) => (
          <div
            className={`peek-day${day.today ? " is-today" : ""}`}
            key={day.n}
          >
            <span>{day.d}</span>
            <b>{day.n}</b>
            {day.dot ? <i /> : null}
          </div>
        ))}
      </div>

      <div className="peek-list">
        <div className="peek-item is-done">
          <span className="peek-check">
            <Check />
          </span>
          <span className="peek-bar" />
          <span className="peek-tag is-mint">Done</span>
        </div>
        <div className="peek-item is-todo">
          <span className="peek-check" />
          <span className="peek-bar is-short" />
          <span className="peek-tag">6pm</span>
        </div>
        <div className="peek-item is-todo">
          <span className="peek-check" />
          <span className="peek-bar" />
        </div>
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const features: Array<{ title: string; body: string; icon: ReactNode }> = [
  {
    title: "Calendar",
    body: "A shared month view with everyone's events colour-coded, so the week is never a surprise.",
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    title: "Tasks & chores",
    body: "Assign the dishes, the bins, the school run — with due dates and gentle repeats.",
    icon: (
      <svg {...iconProps}>
        <path d="M11 3 4 10l-2-2" />
        <path d="m21 6-9 9-2-2" />
        <path d="M11 18H4" />
        <path d="M21 13v6" />
      </svg>
    ),
  },
  {
    title: "Shopping lists",
    body: "One list the whole house can add to, tick off at the shop, and never duplicate.",
    icon: (
      <svg {...iconProps}>
        <path d="M6 2 3 6v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    title: "Home admin",
    body: "Bills, renewals, and warranties tracked in one place, with what's due and who owns it.",
    icon: (
      <svg {...iconProps}>
        <path d="M3 21h18" />
        <path d="M5 21V8l7-5 7 5v13" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    title: "Reminders",
    body: "Nudges for the things that matter, sent to the right person at the right time.",
    icon: (
      <svg {...iconProps}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    ),
  },
  {
    title: "Everyone in the loop",
    body: "Invite the people you live with and give each their own colour and shared view.",
    icon: (
      <svg {...iconProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];
