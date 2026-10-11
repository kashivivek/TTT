package online.tvtime.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import androidx.tvprovider.media.tv.TvContractCompat;
import androidx.tvprovider.media.tv.WatchNextProgram;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.json.JSONObject;

/**
 * Publishes TTT's "next episode" cards to the Android TV / Google TV home screen (Watch Next row).
 * Called from src/lib/watch-next.ts. Apps can only see and change their own Watch Next entries.
 */
@CapacitorPlugin(name = "WatchNext")
public class WatchNextPlugin extends Plugin {

    private static final String SITE = "https://tvtime.online";

    @PluginMethod
    public void sync(PluginCall call) {
        JSArray items = call.getArray("items", new JSArray());
        new Thread(() -> {
            try {
                syncItems(items);
                call.resolve();
            } catch (Exception e) {
                call.reject("Watch Next sync failed", e);
            }
        }).start();
    }

    private void syncItems(JSArray items) throws Exception {
        ContentResolver resolver = getContext().getContentResolver();

        // internalProviderId -> row id; plus the ones the user removed from the row
        Map<String, Long> existing = new HashMap<>();
        Set<String> removedByUser = new HashSet<>();
        try (Cursor cursor = resolver.query(TvContractCompat.WatchNextPrograms.CONTENT_URI, WatchNextProgram.PROJECTION, null, null, null)) {
            while (cursor != null && cursor.moveToNext()) {
                WatchNextProgram program = WatchNextProgram.fromCursor(cursor);
                String key = program.getInternalProviderId();
                if (key == null) continue;
                existing.put(key, program.getId());
                if (!program.isBrowsable()) removedByUser.add(key);
            }
        }

        Set<String> keep = new HashSet<>();
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.getJSONObject(i);
            String key = item.getString("id");
            keep.add(key);
            if (removedByUser.contains(key)) continue;

            boolean episode = item.has("season") && item.has("episode");
            WatchNextProgram.Builder builder = new WatchNextProgram.Builder();
            builder
                .setType(episode ? TvContractCompat.WatchNextPrograms.TYPE_TV_EPISODE : TvContractCompat.WatchNextPrograms.TYPE_MOVIE)
                .setWatchNextType(
                    episode ? TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_NEXT : TvContractCompat.WatchNextPrograms.WATCH_NEXT_TYPE_WATCHLIST
                )
                .setLastEngagementTimeUtcMillis(item.optLong("lastEngagement", System.currentTimeMillis()))
                .setInternalProviderId(key)
                .setTitle(item.getString("title"))
                .setIntentUri(openIntentUri(item.getString("path")));
            if (item.has("image")) {
                builder
                    .setPosterArtUri(Uri.parse(item.getString("image")))
                    .setPosterArtAspectRatio(TvContractCompat.WatchNextPrograms.ASPECT_RATIO_16_9);
            }
            if (episode) {
                builder.setSeasonNumber(item.getInt("season")).setEpisodeNumber(item.getInt("episode"));
                String episodeTitle = item.optString("episodeTitle", "");
                if (!episodeTitle.isEmpty()) builder.setEpisodeTitle(episodeTitle);
            }

            ContentValues values = builder.build().toContentValues();
            Long rowId = existing.get(key);
            if (rowId != null) {
                resolver.update(TvContractCompat.buildWatchNextProgramUri(rowId), values, null, null);
            } else {
                resolver.insert(TvContractCompat.WatchNextPrograms.CONTENT_URI, values);
            }
        }

        for (Map.Entry<String, Long> entry : existing.entrySet()) {
            if (!keep.contains(entry.getKey())) {
                resolver.delete(TvContractCompat.buildWatchNextProgramUri(entry.getValue()), null, null);
            }
        }
    }

    /** Opens this app (not a browser) at the website path; NativeBridge maps it to the in-app page. */
    private Uri openIntentUri(String path) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(SITE + path));
        intent.setPackage(getContext().getPackageName());
        return Uri.parse(intent.toUri(Intent.URI_INTENT_SCHEME));
    }
}
