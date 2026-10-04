import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

/** Shared shell for static content pages (about, privacy, terms, contact). */
export default function ContentPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <Link href="/" className="text-accent-yellow font-extrabold text-xl">
          TTT
        </Link>
        <Link href="/signup" className="bg-accent-yellow text-bg-primary font-bold px-4 py-2 rounded-xl text-sm hover:brightness-110">
          Sign Up Free
        </Link>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-8 text-text-primary leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-3 [&_p]:text-text-muted [&_p]:mb-4 [&_li]:text-text-muted [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_ul]:mb-4 [&_a]:text-accent-yellow [&_a:hover]:underline">
        <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">{title}</h1>
        {updated && <p className="text-sm">Last updated: {updated}</p>}
        {children}
      </article>
      <SiteFooter />
    </main>
  );
}
