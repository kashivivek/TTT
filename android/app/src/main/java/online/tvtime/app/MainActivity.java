package online.tvtime.app;

import android.app.UiModeManager;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // TVs report a 960px-wide viewport, which renders the tablet layout zoomed in; let the page ask for a wider one.
        UiModeManager uiMode = (UiModeManager) getSystemService(UI_MODE_SERVICE);
        if (uiMode != null && uiMode.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION) {
            WebSettings settings = getBridge().getWebView().getSettings();
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
        }

        // Light status/nav bar icons on our dark background, set natively so it never depends on the website.
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(false);
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightNavigationBars(false);

        // Keep web content clear of the status bar, navigation bar, notch and keyboard,
        // regardless of the page's viewport-fit setting (Android 15+ forces edge-to-edge).
        View container = (View) getBridge().getWebView().getParent();
        ViewCompat.setOnApplyWindowInsetsListener(container, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
