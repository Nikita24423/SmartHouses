"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DESIGN_STYLES } from "@/lib/styles";
import { getModePreviewImage, getStylePreviewImage } from "@/lib/style-preview-images";
import { useLocale } from "@/components/locale-provider";
import { useTheme } from "@/components/theme-provider";
import { LogoWithText } from "@/components/logo";
import { LandingReveal } from "@/components/landing-reveal";
import { LandingShowcase } from "@/components/landing-showcase";
import { MoonIcon, SunIcon } from "@/components/ui-icons";

const FEATURED_STYLES = ["scandinavian", "minimalism", "classic", "industrial", "japanese", "hi-tech", "boho", "hygge"];

function StepIcon({ kind }: { kind: "upload" | "style" | "compare" }) {
  if (kind === "upload") {
    return (
      <svg aria-hidden="true" className="lp-step-icon" viewBox="0 0 24 24">
        <path d="M12 16V4m0 0 4 4m-4-4-4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      </svg>
    );
  }
  if (kind === "style") {
    return (
      <svg aria-hidden="true" className="lp-step-icon" viewBox="0 0 24 24">
        <path d="M4 18h16M6 14l3-8 4 6 3-4 2 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        <circle cx="8" cy="8" fill="currentColor" r="1.2" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="lp-step-icon" viewBox="0 0 24 24">
      <rect fill="none" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" width="8" x="3" y="5" />
      <rect fill="none" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" width="8" x="13" y="5" />
      <path d="M11 12h2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function LandingPreviewMedia({
  label,
  sceneClassName = "",
  src,
  thumbSizes = "(max-width: 720px) 100vw, (max-width: 960px) 50vw, 33vw",
}: {
  label: string;
  sceneClassName?: string;
  src: string;
  thumbSizes?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`lp-style-media ${expanded ? "is-expanded" : ""}`.trim()}>
      <button
        aria-expanded={expanded}
        aria-label={label}
        className="lp-style-tap"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <div className={`lp-style-scene ${sceneClassName}`.trim()}>
          <Image
            alt={label}
            className="lp-style-photo"
            fill
            sizes={thumbSizes}
            src={src}
          />
        </div>
      </button>
      <div aria-hidden={!expanded} className="lp-style-mobile-panel">
        <Image alt={label} className="lp-style-photo" fill sizes="100vw" src={src} />
      </div>
    </div>
  );
}

export function LandingPage() {
  const { tr, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const startHref = "/login?callbackUrl=%2Fstudio";
  const styles = DESIGN_STYLES.filter((style) => FEATURED_STYLES.includes(style.id));

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  const steps = [
    { icon: "upload" as const, title: tr("landing.step1Title"), desc: tr("landing.step1Desc") },
    { icon: "style" as const, title: tr("landing.step2Title"), desc: tr("landing.step2Desc") },
    { icon: "compare" as const, title: tr("landing.step3Title"), desc: tr("landing.step3Desc") },
  ];

  return (
    <div className="lp-page">
      <div aria-hidden="true" className="lp-ambient">
        <span className="lp-ambient-orb lp-ambient-orb-a" />
        <span className="lp-ambient-orb lp-ambient-orb-b" />
        <span className="lp-ambient-grid" />
        <span className="lp-ambient-grain" />
      </div>

      <header className={`lp-nav ${navScrolled ? "is-scrolled" : ""}`.trim()}>
        <Link aria-label={tr("brand")} className="lp-nav-brand" href="/">
          <LogoWithText size="md" />
        </Link>
        <button
          aria-controls="lp-nav-menu"
          aria-expanded={navOpen}
          aria-label={navOpen ? "Close menu" : "Open menu"}
          className="lp-nav-toggle"
          onClick={() => setNavOpen((value) => !value)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
        <nav className={`lp-nav-links ${navOpen ? "is-open" : ""}`.trim()} id="lp-nav-menu">
          <a href="#how" onClick={() => setNavOpen(false)}>
            {tr("nav.howItWorks")}
          </a>
          <a href="#modes" onClick={() => setNavOpen(false)}>
            {tr("nav.features")}
          </a>
          <a href="#styles" onClick={() => setNavOpen(false)}>
            {tr("landing.stylesNav")}
          </a>
          <div className="lp-nav-mobile-cta">
            <Link className="lp-cta" href={startHref} onClick={() => setNavOpen(false)}>
              {tr("landing.cta")}
            </Link>
          </div>
        </nav>
        <div className="lp-nav-actions">
          <button
            aria-label={theme === "dark" ? tr("app.themeLight") : tr("app.themeDark")}
            className="lp-ghost lp-tool-icon"
            onClick={toggleTheme}
            type="button"
          >
            {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
          <button
            className="lp-ghost"
            onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
            type="button"
          >
            {locale === "ru" ? "EN" : "RU"}
          </button>
          <Link className="lp-login" href={startHref}>
            {tr("nav.login")}
          </Link>
          <Link className="lp-cta lp-cta-compact" href={startHref}>
            {tr("landing.cta")}
          </Link>
        </div>
      </header>
      {navOpen ? <button aria-label="Close menu" className="lp-nav-backdrop" onClick={() => setNavOpen(false)} type="button" /> : null}

      <main>
        <section aria-labelledby="hero-title" className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-kicker">{tr("tagline")}</p>
            <h1 id="hero-title">{tr("landing.heroTitle")}</h1>
            <p className="lp-lead">{tr("landing.heroSubtitle")}</p>
            <div className="lp-hero-actions">
              <Link className="lp-cta" href={startHref}>
                {tr("landing.cta")}
                <span aria-hidden="true">↗</span>
              </Link>
              <a className="lp-secondary" href="#how">
                {tr("landing.ctaSecondary")}
              </a>
            </div>
            <ul className="lp-proof">
              <li>{tr("landing.proof1")}</li>
              <li>{tr("landing.proof2")}</li>
              <li>{tr("landing.proof3")}</li>
            </ul>
          </div>

          <LandingShowcase
            afterLabel={tr("landing.compareAfter")}
            beforeLabel={tr("landing.compareBefore")}
            hint={tr("landing.compareHint")}
            planTitle={tr("landing.planTitle")}
            stagingLabel={tr("landing.stagingLabel")}
            bathLabel={tr("landing.roomBath")}
            roomLabels={{
              living: tr("landing.roomLiving"),
              kitchen: tr("landing.roomKitchen"),
              bedroom: tr("landing.roomBedroom"),
            }}
            styleLabels={{
              scandi: tr("landing.styleScandi"),
              industrial: tr("landing.styleIndustrial"),
              classic: tr("landing.styleClassic"),
            }}
            tourLabel={tr("landing.tourLabel")}
          />
        </section>

        <section className="lp-section" id="how">
          <LandingReveal className="lp-section-head">
            <p className="lp-kicker">{tr("landing.howKicker")}</p>
            <h2>{tr("landing.stepsTitle")}</h2>
          </LandingReveal>
          <ol className="lp-steps">
            {steps.map((step, index) => (
              <LandingReveal as="li" className="lp-card lp-step-card" delay={index * 90} key={step.title}>
                <div className="lp-step-visual">
                  <StepIcon kind={step.icon} />
                  <span className="lp-step-num">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </LandingReveal>
            ))}
          </ol>
        </section>

        <section className="lp-section" id="modes">
          <LandingReveal className="lp-section-head">
            <p className="lp-kicker">{tr("landing.modesKicker")}</p>
            <h2>{tr("landing.modesTitle")}</h2>
            <p className="lp-section-lead">{tr("landing.modesLead")}</p>
          </LandingReveal>
          <div className="lp-modes">
            {(
              [
                { key: "photo" as const, title: tr("landing.modePhotoTitle"), desc: tr("landing.modePhotoDesc"), scene: "lp-mode-scene lp-mode-scene-photo" },
                { key: "plan" as const, title: tr("landing.modePlanTitle"), desc: tr("landing.modePlanDesc"), scene: "lp-mode-scene lp-mode-scene-plan" },
                { key: "tour" as const, title: tr("landing.modeTourTitle"), desc: tr("landing.modeTourDesc"), scene: "lp-mode-scene lp-mode-scene-tour" },
              ] as const
            ).map((mode, index) => (
              <LandingReveal as="article" className="lp-card lp-style-card" delay={index * 80} key={mode.key}>
                <LandingPreviewMedia
                  label={mode.title}
                  sceneClassName={mode.scene}
                  src={getModePreviewImage(mode.key)}
                  thumbSizes="(max-width: 720px) 100vw, (max-width: 960px) 50vw, 33vw"
                />
                <h3>{mode.title}</h3>
                <p>{mode.desc}</p>
              </LandingReveal>
            ))}
          </div>
        </section>

        <section className="lp-section" id="styles">
          <LandingReveal className="lp-section-head">
            <p className="lp-kicker">{tr("landing.stylesKicker")}</p>
            <h2>{tr("landing.stylesTitle")}</h2>
            <p className="lp-section-lead">{tr("landing.stylesLead")}</p>
          </LandingReveal>
          <div className="lp-styles">
            {styles.map((style, index) => {
              const previewSrc = getStylePreviewImage(style.id);
              return (
                <LandingReveal as="article" className="lp-card lp-style-card" delay={(index % 4) * 70} key={style.id}>
                  {previewSrc ? (
                    <LandingPreviewMedia
                      label={style.name}
                      src={previewSrc}
                      thumbSizes="(max-width: 720px) 100vw, (max-width: 960px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="lp-style-media">
                      <div className="lp-style-scene">
                        <div aria-hidden="true" className={`lp-style-fallback lp-style-${style.id}`}>
                          <span className="lp-style-window" />
                          <span className="lp-style-sofa" />
                          <span className="lp-style-table" />
                        </div>
                      </div>
                    </div>
                  )}
                  <h3>{style.name}</h3>
                </LandingReveal>
              );
            })}
          </div>
        </section>

        <LandingReveal className="lp-finale">
          <div aria-hidden="true" className="lp-finale-glow" />
          <h2>{tr("landing.ctaTitle")}</h2>
          <p>{tr("landing.ctaLead")}</p>
          <Link className="lp-cta lp-cta-glow" href={startHref}>
            {tr("landing.cta")}
            <span aria-hidden="true">↗</span>
          </Link>
        </LandingReveal>
      </main>

      <footer className="lp-footer">
        <LogoWithText size="sm" />
        <p>{tr("landing.footer")}</p>
      </footer>
    </div>
  );
}
