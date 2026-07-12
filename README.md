# TV Time Tracker

TV Time Tracker is a sleek, modern web application designed to help you organize, track, and manage your TV shows and movies. Built as a powerful alternative to existing tracking platforms, it offers lightning-fast syncing, deep TMDB integration, and a premium user interface.

## 🌟 Features

- **Seamless Watch Tracking**: Keep track of the exact season and episode you are on with one-click season-level watching.
- **TV Time Zip Import**: Moving platforms? Easily upload your exported TV Time `.zip` archive. The engine will intelligently resolve your history, advance your active shows to the next available episode, and sort everything automatically.
- **Smart Upcoming Episodes**: Never miss a release. Unreleased episodes and returning seasons are parsed automatically and securely placed into your "Upcoming Episodes" section until their exact air date.
- **Interactive Dashboard**: A dynamic dashboard that sorts your watchlist into "Current Shows", "Not Watched Recently", "Upcoming", and "Completed" to keep your backlog clean.
- **Zero API Lag**: Background syncing guarantees that your dashboard loads instantaneously, bypassing frontend API rate limit restrictions.
- **Feedback & Emotion Tracking**: Let the app know how an episode made you feel, complete with user-friendly snoozing functionalities.
- **Authentication**: Secure email/password login, password resets, and user session management powered by Supabase Auth.

## 🛠 Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), React, Tailwind CSS
- **Backend/Database**: [Supabase](https://supabase.com/) (PostgreSQL & Auth)
- **Data Integration**: [TMDB API](https://www.themoviedb.org/documentation/api)

## 🚀 Getting Started

### Prerequisites

You will need Node.js installed, as well as a Supabase project and a TMDB Developer API Key.

### Environment Variables

Create a `.env.local` file in the root directory and add your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key
```

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🎨 UI / UX

The app relies heavily on a premium aesthetic utilizing custom `card-surface` backgrounds, yellow accenting, smooth slide-up animations, and intuitive micro-interactions to create a cinematic and engaging experience.

## 📄 License
MIT License
