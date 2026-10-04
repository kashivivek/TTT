import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-card-surface mt-10">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4 text-xs text-text-muted">
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-text-primary">
              {l.label}
            </Link>
          ))}
        </nav>
        <p>
          This product uses the{" "}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="text-accent-yellow hover:underline">
            TMDB
          </a>{" "}
          API but is not endorsed or certified by TMDB. {SITE_NAME} is an independent project and is not affiliated with TV
          Time or Whip Media.
        </p>
        <p>
          {SITE_NAME} &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
