import JSZip from "jszip";
import { searchMulti } from "./tmdb";
import { getSupabase } from "./supabase";
import type { WatchHistoryEntry } from "./types";

interface ImportProgress {
  stage: string;
  current: number;
  total: number;
}

function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length < 2) return [];
  
  const parseLine = (line: string) => {
    const result = [];
    let curVal = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i < line.length - 1 && line[i+1] === '"') {
            curVal += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          curVal += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(curVal);
          curVal = '';
        } else {
          curVal += char;
        }
      }
    }
    result.push(curVal);
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() || "";
    }
    rows.push(row);
  }
  
  return rows;
}

export async function parseImportZip(
  file: File,
  user: any,
  onProgress?: (p: ImportProgress) => void
): Promise<{ imported: number; errors: string[] }> {
  const errors: string[] = [];
  let imported = 0;

  try {
    onProgress?.({ stage: "Reading zip file...", current: 0, total: 1 });
    const zip = await JSZip.loadAsync(file);
    const entries = Object.keys(zip.files);
    console.log("[Import] Zip entries found:", entries);

    // Step 2: File Selection
    const tvFile = entries.find((n) => n.includes("tracking-prod-records-v2.csv")) ||
                   entries.find((n) => n.includes("episodes.csv") || n.includes("shows.csv"));
    const movieFile = entries.find((n) => n.includes("tracking-prod-records.csv")) ||
                      entries.find((n) => n.includes("movies.csv"));
    
    // New Files
    const ratingsFile = entries.find(n => n.includes("ratings-3-prod-episode_votes.csv"));
    const commentsFile = entries.find(n => n.includes("comments-prod-comments.csv"));
    const emotionsFile = entries.find(n => n.includes("tv_show_user_emotion_count.csv"));
    const favoritesFile = entries.find(n => n.includes("user_tv_show_data.csv"));
    const badgesFile = entries.find(n => n.includes("user_badge.csv"));

    if (!tvFile && !movieFile) {
      return {
        imported: 0,
        errors: [`InvalidArchiveStructure: Could not find core target files. Found: ${entries.join(", ")}`],
      };
    }

    const records: Array<{
      title: string;
      media_type: "tv" | "movie";
      season_number?: number;
      episode_number?: number;
      year?: number;
      type: "watch" | "track" | "rating" | "comment" | "emotion" | "favorite";
      watched_at?: string;
      rating_value?: string;
      comment_text?: string;
      emotion_value?: string;
    }> = [];

    // Step 3: Row Parsing
    
    // Parse TV Data
    if (tvFile) {
      const tvContent = await zip.files[tvFile].async("string");
      const data = parseCsv(tvContent);
      for (const row of data) {
        const show_name = row["series_name"] || row["show_name"] || row["title"] || row["name"];
        const season = parseInt(row["season_number"] || row["s_no"] || row["season"]) || 1;
        const episode = parseInt(row["episode_number"] || row["ep_no"] || row["episode"]) || 1;
        const watched_at = row["watched_at"] || row["updated_at"] || row["created_at"] || new Date().toISOString();
        const progress = row["progress"];
        
        const isWatched = row["key"]?.startsWith("watch-episode");
        const isFollowOnly = row["key"]?.startsWith("user-series") || row["is_followed"] === "true";

        if (show_name && (isWatched || isFollowOnly)) {
          records.push({
            title: show_name,
            media_type: "tv",
            season_number: season,
            episode_number: episode,
            type: isWatched ? "watch" : "track",
            watched_at,
          });
        }
      }
    }

    // Parse Movie Data
    if (movieFile) {
      const movieContent = await zip.files[movieFile].async("string");
      const data = parseCsv(movieContent);
      for (const row of data) {
        const movie_name = row["movie_name"] || row["title"] || row["name"];
        const year = parseInt(row["release_date"] || row["year"]) || 0;
        const watched_at = row["watched_at"] || row["updated_at"] || row["created_at"] || new Date().toISOString();
        const type = row["type"] || row["status"];
        
        const isWatched = type === "watch" || type === "watched" || type === "completed" || type === "rewatch_count" || !!row["watched_at"];
        const isFollowOnly = type === "follow" || type === "towatch" || row["type-uuid-n"]?.startsWith("follow") || row["type-uuid-n"]?.startsWith("towatch");

        if (movie_name && (isWatched || isFollowOnly)) {
          records.push({
            title: movie_name,
            media_type: "movie",
            year,
            type: isWatched ? "watch" : "track",
            watched_at,
          });
        }
      }
    }
    
    // Parse Ratings
    if (ratingsFile) {
      const content = await zip.files[ratingsFile].async("string");
      const data = parseCsv(content);
      for (const row of data) {
        const movie_name = row["movie_name"];
        const series_name = row["series_name"];
        const title = movie_name || series_name;
        if (title) {
          records.push({
            title,
            media_type: movie_name ? "movie" : "tv",
            season_number: parseInt(row["season_number"]) || 1,
            episode_number: parseInt(row["episode_number"]) || 1,
            type: "rating",
            rating_value: row["vote_key"] || row["rating"],
          });
        }
      }
    }
    
    // Parse Comments
    if (commentsFile) {
      const content = await zip.files[commentsFile].async("string");
      const data = parseCsv(content);
      for (const row of data) {
        const movie_name = row["movie_name"];
        const series_name = row["series_name"];
        const title = movie_name || series_name;
        const comment = row["text"] || row["comment"];
        if (title && comment) {
          records.push({
            title,
            media_type: movie_name ? "movie" : "tv",
            season_number: parseInt(row["season_number"]) || 1,
            episode_number: parseInt(row["episode_number"]) || 1,
            type: "comment",
            comment_text: comment,
          });
        }
      }
    }
    
    // Parse Emotions
    if (emotionsFile) {
      const content = await zip.files[emotionsFile].async("string");
      const data = parseCsv(content);
      for (const row of data) {
        const title = row["series_name"] || row["movie_name"];
        const emotion = row["emotion"] || row["reaction"];
        if (title && emotion) {
          records.push({
            title,
            media_type: row["movie_name"] ? "movie" : "tv",
            season_number: parseInt(row["season_number"]) || 1,
            episode_number: parseInt(row["episode_number"]) || 1,
            type: "emotion",
            emotion_value: emotion,
          });
        }
      }
    }
    
    // Parse Favorites
    if (favoritesFile) {
      const content = await zip.files[favoritesFile].async("string");
      const data = parseCsv(content);
      for (const row of data) {
        if (row["is_favorited"] === "1" || row["is_favorited"] === "true") {
          const title = row["tv_show_name"];
          if (title) {
             records.push({
               title,
               media_type: "tv",
               type: "favorite"
             });
          }
        }
      }
    }
    
    // Parse Badges (Direct Insert)
    const badgePayload = [];
    if (badgesFile) {
      const content = await zip.files[badgesFile].async("string");
      const data = parseCsv(content);
      for (const row of data) {
        const badge_name = row["badge_name"] || row["name"];
        if (badge_name) {
          badgePayload.push({
            user_id: user.id,
            badge_name: badge_name,
            earned_at: row["created_at"] || new Date().toISOString()
          });
        }
      }
    }

    if (records.length === 0 && badgePayload.length === 0) {
      return { imported: 0, errors: ["No valid records found after parsing."] };
    }

    // Step 5: Entity Resolution System
    onProgress?.({ stage: "Resolving titles via TMDb...", current: 0, total: records.length });

    // Group by title to minimize API calls
    const titleGroups = new Map<string, typeof records>();
    for (const r of records) {
      const key = `${r.media_type}_${r.title.toLowerCase().trim()}`;
      if (!titleGroups.has(key)) titleGroups.set(key, []);
      titleGroups.get(key)!.push(r);
    }

    const keyToTmdbData = new Map<string, { id: number; name: string; backdrop: string | null }>();
    let resolved = 0;
    const uniqueKeys = Array.from(titleGroups.keys());

    for (const key of uniqueKeys) {
      const group = titleGroups.get(key)!;
      const title = group[0].title;
      const type = group[0].media_type;

      try {
        const result = await searchMulti(title);
        const matches = result.results.filter(r => r.media_type === type);
        
        const saveMatch = (match: any) => {
          keyToTmdbData.set(key, {
            id: match.id,
            name: match.title || match.name,
            backdrop: match.backdrop_path || match.poster_path || null,
          });
        };

        if (matches.length > 0) {
          saveMatch(matches[0]);
        } else {
          const cleaned = title.replace(/\s*\(.*?\)\s*/g, "").replace(/[^a-zA-Z0-9\s]/g, "");
          const retryResult = await searchMulti(cleaned);
          const retryMatches = retryResult.results.filter(r => r.media_type === type);
          if (retryMatches.length > 0) {
            saveMatch(retryMatches[0]);
          } else {
             errors.push(`Tier 4 Failure: Could not resolve "${title}".`);
          }
        }
      } catch {
        errors.push(`API error resolving "${title}".`);
      }
      
      resolved++;
      onProgress?.({ stage: "Resolving titles via TMDb...", current: resolved, total: uniqueKeys.length });
      await new Promise((r) => setTimeout(r, 150)); // Rate limiting
    }

    const watchPayload = [];
    const ratingsPayload = [];
    const commentsPayload = [];
    const emotionsPayload = [];
    const favoritesPayload = [];

    // Deduplicate on the fly using Sets
    const seenWatch = new Set();
    const seenRatings = new Set();
    const seenComments = new Set();
    const seenEmotions = new Set();
    const seenFavorites = new Set();
    
    const finalTrackedShows = new Map<number, any>();
    const watchedMovies = new Set<number>();

    for (const r of records) {
      const key = `${r.media_type}_${r.title.toLowerCase().trim()}`;
      const tmdbData = keyToTmdbData.get(key);
      if (!tmdbData) continue;

      const recordKey = `${tmdbData.id}_${r.season_number}_${r.episode_number}`;

      // Aggregate Tracked Shows
      if (r.media_type === "tv") {
        if (!finalTrackedShows.has(tmdbData.id)) {
          finalTrackedShows.set(tmdbData.id, {
            user_id: user.id,
            tmdb_id: tmdbData.id,
            name: tmdbData.name,
            media_type: r.media_type,
            backdrop_path: tmdbData.backdrop,
            current_season: 1,
            current_episode: 1,
            episode_title: "Episode 1",
            updated_at: new Date().toISOString()
          });
        }
        if (r.type === "watch") {
          const track = finalTrackedShows.get(tmdbData.id);
          const s = r.season_number || 1;
          const e = r.episode_number || 1;
          if (s > track.current_season || (s === track.current_season && e > track.current_episode)) {
             track.current_season = s;
             track.current_episode = e;
             track.episode_title = `Episode ${e}`;
          }
        }
      } else if (r.media_type === "movie") {
         if (r.type === "watch") {
            watchedMovies.add(tmdbData.id);
            finalTrackedShows.delete(tmdbData.id);
         } else if (r.type === "track" && !watchedMovies.has(tmdbData.id)) {
            finalTrackedShows.set(tmdbData.id, {
               user_id: user.id,
               tmdb_id: tmdbData.id,
               name: tmdbData.name,
               media_type: r.media_type,
               backdrop_path: tmdbData.backdrop,
               current_season: 0,
               current_episode: 0,
               episode_title: "Watchlist",
               updated_at: new Date().toISOString()
            });
         }
      }

      if (r.type === "watch") {
        if (!seenWatch.has(recordKey)) {
          seenWatch.add(recordKey);
          watchPayload.push({
            user_id: user.id,
            tmdb_id: tmdbData.id,
            media_type: r.media_type,
            season_number: r.season_number || null,
            episode_number: r.episode_number || null,
            watched_at: r.watched_at,
          });
        }
      } else if (r.type === "rating") {
         if (!seenRatings.has(recordKey)) {
          seenRatings.add(recordKey);
          ratingsPayload.push({
            user_id: user.id,
            tmdb_id: tmdbData.id,
            media_type: r.media_type,
            season_number: r.season_number || null,
            episode_number: r.episode_number || null,
            rating_value: r.rating_value,
          });
         }
      } else if (r.type === "comment") {
         const cKey = recordKey + "_" + r.comment_text;
         if (!seenComments.has(cKey)) {
          seenComments.add(cKey);
          commentsPayload.push({
            user_id: user.id,
            tmdb_id: tmdbData.id,
            media_type: r.media_type,
            season_number: r.season_number || null,
            episode_number: r.episode_number || null,
            comment_text: r.comment_text,
          });
         }
      } else if (r.type === "emotion") {
         if (!seenEmotions.has(recordKey)) {
          seenEmotions.add(recordKey);
          emotionsPayload.push({
            user_id: user.id,
            tmdb_id: tmdbData.id,
            media_type: r.media_type,
            season_number: r.season_number || null,
            episode_number: r.episode_number || null,
            emotion: r.emotion_value,
          });
         }
      } else if (r.type === "favorite") {
         if (!seenFavorites.has(tmdbData.id)) {
          seenFavorites.add(tmdbData.id);
          favoritesPayload.push({
            user_id: user.id,
            tmdb_id: tmdbData.id,
            media_type: r.media_type,
          });
         }
      }
    }

      const trackPayload = Array.from(finalTrackedShows.values());

    // Step 5: Database Injection
    onProgress?.({ stage: "Saving to database...", current: 0, total: 100 });
    
    // Explicit deduplication for core tables
    const { data: existingWatch } = await getSupabase()
        .from("watch_history")
        .select("tmdb_id, season_number, episode_number, media_type")
        .eq("user_id", user.id);
        
    const existingWatchSet = new Set((existingWatch || []).map(r => 
        r.media_type === "movie" ? `MOVIE_${r.tmdb_id}` : `TV_${r.tmdb_id}_${r.season_number}_${r.episode_number}`
    ));
    const finalWatchPayload = watchPayload.filter(r => {
        const k = r.media_type === "movie" ? `MOVIE_${r.tmdb_id}` : `TV_${r.tmdb_id}_${r.season_number}_${r.episode_number}`;
        return !existingWatchSet.has(k);
    });

    const { data: existingTracked } = await getSupabase()
        .from("tracked_shows")
        .select("tmdb_id")
        .eq("user_id", user.id);
        
    const existingTrackedSet = new Set((existingTracked || []).map(r => r.tmdb_id));
    
    // For tracked shows, we actually want to UPSERT so we update the progress
    // We will separate inserts and updates
    const trackInserts = trackPayload.filter(r => !existingTrackedSet.has(r.tmdb_id));
    const trackUpdates = trackPayload.filter(r => existingTrackedSet.has(r.tmdb_id));

    // Generic batch insert helper
    const insertBatch = async (table: string, payload: any[]) => {
      if (payload.length === 0) return;
      for (let i = 0; i < payload.length; i += 100) {
        const batch = payload.slice(i, i + 100);
        try {
          const { error } = await getSupabase().from(table).insert(batch);
          if (error) {
              if (error.code === '23505') {
                 // Ignore unique constraint violations gracefully
                 continue;
              }
              errors.push(`DB error (${table}): ${error.message}`);
          }
          else imported += batch.length;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown db error";
          errors.push(`DB exception (${table}): ${msg}`);
        }
      }
    };

    // Clean up watched movies from tracked_shows
    if (watchedMovies.size > 0) {
      const watchedMovieIds = Array.from(watchedMovies);
      for (let i = 0; i < watchedMovieIds.length; i += 100) {
        const batch = watchedMovieIds.slice(i, i + 100);
        try {
          await getSupabase().from("tracked_shows")
            .delete()
            .eq("user_id", user.id)
            .in("tmdb_id", batch);
        } catch (e) {
          // ignore
        }
      }
    }

    await insertBatch("watch_history", finalWatchPayload);
    
    // Insert new tracked shows
    await insertBatch("tracked_shows", trackInserts);
    
    // Update existing tracked shows
    for (let i = 0; i < trackUpdates.length; i += 100) {
      const batch = trackUpdates.slice(i, i + 100);
      try {
        await getSupabase().from("tracked_shows").upsert(batch, { onConflict: "user_id,tmdb_id" });
      } catch (e) {
        if (e && typeof e === 'object' && 'code' in e && e.code === '23505') {
          // Fallback ignore
        }
      }
    }

    // Now insert the rest
    await insertBatch("user_ratings", ratingsPayload);
    await insertBatch("user_comments", commentsPayload);
    await insertBatch("user_emotions", emotionsPayload);
    await insertBatch("user_favorites", favoritesPayload);
    await insertBatch("user_badges", badgePayload);

    onProgress?.({ stage: "Saving to database...", current: 100, total: 100 });

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to process zip file";
    errors.push(msg);
  }

  return { imported, errors };
}
