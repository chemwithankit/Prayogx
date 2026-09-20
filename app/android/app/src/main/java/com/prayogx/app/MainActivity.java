package com.prayogx.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.util.Locale;

/**
 * Android 16 makes edge-to-edge compulsory for anything targeting API 36, and
 * windowOptOutEdgeToEdgeEnforcement no longer works. The WebView therefore fills the whole
 * screen, status bar and navigation bar included, and without this class the app header
 * would sit under the clock and the tab bar under the gesture pill.
 *
 * The shell already knows how to keep clear of them. app.css reads four custom properties:
 *
 *     --safe-t  --safe-b  --safe-l  --safe-r
 *
 * and every surface that touches an edge is padded by them - the header, the viewer bar,
 * the tab bar, the simulation frame, the filter sheet, the toast. On iOS those properties
 * resolve to env(safe-area-inset-*) and this file is not involved at all. Android WebView
 * does not report the system bars through env(), only display cutouts, so the values have
 * to be handed across from the native side. That is the whole job here.
 *
 * Note what this deliberately does NOT do: it does not move, pad or shrink the WebView.
 * The WebView stays full-bleed, so the header's own colour paints underneath the status
 * bar and the tab bar's colour underneath the navigation bar, in whichever theme is
 * active. That is what edge-to-edge is supposed to look like, and it keeps the two bars
 * in step with the in-app light/dark switch for free.
 */
public class MainActivity extends BridgeActivity {

    /** Latest system-bar + cutout insets, in physical pixels. */
    private Insets insets = Insets.NONE;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (getBridge() == null) return; // the device has no usable WebView; nothing to inset

        final WebView webView = getBridge().getWebView();
        if (webView == null) return;

        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            publishInsets();
            // Passed on rather than consumed: the WebView's geometry is untouched, and the
            // IME and any future child view still need to see them.
            return windowInsets;
        });

        // The insets arrive on the first layout pass, which is usually before the page
        // exists. Re-publish on every load, or the very first paint would be unpadded and
        // a reload would silently lose the values.
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView view) {
                publishInsets();
            }
        });
    }

    /** Push the current insets into the page as CSS pixels. */
    private void publishInsets() {
        if (getBridge() == null) return;
        final WebView webView = getBridge().getWebView();
        if (webView == null) return;

        final float density = getResources().getDisplayMetrics().density;
        final String js =
            "(function(s){" +
            "s.setProperty('--safe-t','" + cssPx(insets.top, density) + "');" +
            "s.setProperty('--safe-b','" + cssPx(insets.bottom, density) + "');" +
            "s.setProperty('--safe-l','" + cssPx(insets.left, density) + "');" +
            "s.setProperty('--safe-r','" + cssPx(insets.right, density) + "');" +
            "})(document.documentElement.style);";

        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private static String cssPx(int physicalPx, float density) {
        return String.format(Locale.US, "%.2fpx", physicalPx / density);
    }
}
