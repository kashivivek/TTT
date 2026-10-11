package online.tvtime.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.List;

/**
 * Opens a streaming title inside the service's installed app. Android only routes web links to apps that
 * claim them (Netflix does, Hulu/Disney+/Prime mostly don't), so we target the app's package explicitly.
 * Called from src/lib/streaming-links.ts. Result: "title" (opened the link in the app), "app" (opened the app), "none".
 */
@CapacitorPlugin(name = "StreamingApps")
public class StreamingAppsPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        JSArray packages = call.getArray("packages", new JSArray());
        PackageManager pm = getContext().getPackageManager();
        try {
            List<String> names = packages.toList();

            if (url != null) {
                for (String pkg : names) {
                    Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(url)).setPackage(pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    if (view.resolveActivity(pm) != null) {
                        getContext().startActivity(view);
                        resolve(call, "title");
                        return;
                    }
                }
            }

            for (String pkg : names) {
                Intent launch = pm.getLaunchIntentForPackage(pkg);
                // TV apps often only have a TV (leanback) launcher
                if (launch == null) launch = pm.getLeanbackLaunchIntentForPackage(pkg);
                if (launch != null) {
                    getContext().startActivity(launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    resolve(call, "app");
                    return;
                }
            }
            resolve(call, "none");
        } catch (Exception e) {
            call.reject("Could not open streaming app", e);
        }
    }

    private void resolve(PluginCall call, String result) {
        JSObject ret = new JSObject();
        ret.put("result", result);
        call.resolve(ret);
    }
}
