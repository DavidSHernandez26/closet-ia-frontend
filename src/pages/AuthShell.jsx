import React from "react";
import "./AuthShell.css";

/**
 * AuthShell — visual chrome for the Be: Confident auth pages.
 * Renders the mood-board backdrop, veil, top brand bar, and hero copy.
 * The page-specific auth card is passed in via `children`.
 *
 * Props:
 *   - heroEyebrow / heroTitle / heroBody  (override hero copy)
 *   - logoSrc                              (path to your logo img)
 */
export default function AuthShell({
  children,
  heroEyebrow = "✦  Your AI stylist",
  heroTitle = (
    <>
      Every fit,<br />
      <em>curated</em> for you.
    </>
  ),
  heroBody = "Photograph what you own. Let Be: Confident build your virtual closet and suggest outfits that actually feel like you.",
  logoSrc = "/icon-192.png",
}) {
  return (
    <main className="be-stage">
      {/* Mood-board backdrop */}
      <div className="be-moodboard" aria-hidden="true">
        <div className="be-tile a">look 01</div>
        <div className="be-tile b">look 02</div>
        <div className="be-tile c">look 03</div>
        <div className="be-tile d">look 04</div>
        <div className="be-tile a">fit 05</div>
        <div className="be-tile b">fit 06</div>
        <div className="be-tile c">fit 07</div>
        <div className="be-tile d">fit 08</div>
        <div className="be-tile a">fit 09</div>
        <div className="be-tile b">look 10</div>
        <div className="be-tile c">fit 11</div>
        <div className="be-tile d">look 12</div>
      </div>
      <div className="be-veil" aria-hidden="true" />

      {/* Top bar */}
      <header className="be-topbar">
        <div className="be-brand">
          <div className="be-brand-logo">
            {logoSrc && <img src={logoSrc} alt="" />}
          </div>
          <div className="be-brand-name">
            be<span className="be-sep">:</span> confident
          </div>
        </div>
        <div className="be-version">v1.0 · beta</div>
      </header>

      {/* Hero copy (wide screens only) */}
      <div className="be-hero">
        <p className="be-hero-eyebrow">{heroEyebrow}</p>
        <h2>{heroTitle}</h2>
        <p>{heroBody}</p>
      </div>

      {/* Auth card slot */}
      <section className="be-auth-wrap">{children}</section>
    </main>
  );
}
