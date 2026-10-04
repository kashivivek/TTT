import type { Metadata } from "next";
import Link from "next/link";
import ContentPage from "@/components/ContentPage";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${SITE_NAME} is a free, independent TV and movie tracker built as an alternative to TV Time.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ContentPage title={`About ${SITE_NAME}`}>
      <p className="mt-6">
        {SITE_NAME} is a free, independent app for keeping track of the TV shows and movies you watch. It started when long-time
        TV Time users needed a reliable place to move their watch history, and grew into a full tracker built around one
        question: <em>what should I watch next?</em>
      </p>

      <h2>What you can do</h2>
      <ul>
        <li><strong>Track every episode</strong> and always see the next one to watch, with shows that get new seasons coming back to your list automatically.</li>
        <li><strong>Import your TV Time history</strong> from a TV Time data export, including watched episodes, movies, ratings and badges.</li>
        <li><strong>See what&apos;s airing</strong> in the Upcoming calendar, and get an email or push notification the day a new episode comes out.</li>
        <li><strong>Find where to watch</strong> any show or movie in your country.</li>
        <li><strong>Discover something new</strong> with trending lists and AI-powered recommendations based on what you like.</li>
        <li><strong>Rate, review and discuss</strong> titles with other viewers, with spoiler tags to keep things fair.</li>
        <li><strong>Keep your streak going</strong>, earn badges and share your year in TV.</li>
      </ul>

      <h2>Where the data comes from</h2>
      <p>
        Show and movie details, episode guides, cast and images come from{" "}
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">The Movie Database (TMDB)</a>, a
        community-built database. Streaming availability comes from TMDB&apos;s partner JustWatch. This product uses the TMDB
        API but is not endorsed or certified by TMDB.
      </p>

      <h2>Independent and ad-supported</h2>
      <p>
        {SITE_NAME} is built and run independently and is not affiliated with TV Time or Whip Media. It&apos;s free to use and
        supported by ads. Read how we handle your data in our <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Get in touch</h2>
      <p>
        Have an idea, found a bug, or want to say hi? Visit the <Link href="/contact">Contact</Link> page.
      </p>
    </ContentPage>
  );
}
