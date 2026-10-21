package com.songhuodan.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.JavascriptInterface;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * 送货单统计 — 本地壳工程
 * WebView 加载 assets/app/index.html，数据全部保存在应用本地存储，完全离线。
 */
public class MainActivity extends Activity {

    private WebView webView;
    private String pendingPickId = null;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setAllowContentAccess(true);
        ws.setLoadWithOverviewMode(true);
        ws.setUseWideViewPort(true);
        ws.setBuiltInZoomControls(false);
        ws.setSupportZoom(false);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);
        webView.setBackgroundColor(0xFFF4F2EC);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, String url) {
                return false;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new AndroidBridge(), "Android");
        webView.loadUrl("file:///android_asset/app/index.html");
        setContentView(webView);
    }

    /* 系统返回键 → 交回应用内路由栈处理 */
    @Override
    public void onBackPressed() {
        webView.evaluateJavascript("window.__appBack && window.__appBack()", null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        final String cb = pendingPickId;
        pendingPickId = null;
        if (requestCode == 1001 && resultCode == RESULT_OK && data != null && data.getData() != null) {
            final Uri uri = data.getData();
            new Thread(() -> {
                String text = null;
                try (InputStream is = getContentResolver().openInputStream(uri)) {
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = is.read(buf)) != -1) bos.write(buf, 0, n);
                    text = new String(bos.toByteArray(), "UTF-8");
                } catch (Exception e) {
                    text = null;
                }
                final String result = text;
                runOnUiThread(() -> {
                    if (cb == null) return;
                    String js = "window.__fileCallbacks && window.__fileCallbacks['" + cb + "']("
                            + (result == null ? "'read_error'" : "null") + ","
                            + (result == null ? "null" : jsQuote(result)) + ")";
                    webView.evaluateJavascript(js, null);
                });
            }).start();
        } else if (cb != null) {
            webView.evaluateJavascript("window.__fileCallbacks && window.__fileCallbacks['" + cb + "']('canceled',null)", null);
        }
    }

    private static String jsQuote(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
    }

    private class AndroidBridge {

        /* 保存文件到系统「下载/送货单统计」 */
        @JavascriptInterface
        public void saveFile(final String fileName, final String mime, final String base64) {
            runOnUiThread(() -> {
                try {
                    byte[] data = Base64.decode(base64, Base64.DEFAULT);
                    String m = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
                    if (Build.VERSION.SDK_INT >= 29) {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                        cv.put(MediaStore.MediaColumns.MIME_TYPE, m);
                        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/送货单统计");
                        Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                        if (uri == null) throw new Exception("无法创建下载条目");
                        try (OutputStream os = getContentResolver().openOutputStream(uri)) {
                            os.write(data);
                        }
                        toast("已保存到 下载/送货单统计/" + fileName);
                    } else {
                        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "送货单统计");
                        if (!dir.exists()) dir.mkdirs();
                        File f = new File(dir, fileName);
                        try (FileOutputStream fos = new FileOutputStream(f)) {
                            fos.write(data);
                        }
                        toast("已保存到 下载/送货单统计/" + fileName);
                    }
                } catch (Exception e) {
                    toast("保存失败：" + e.getMessage());
                }
            });
        }

        /* 选择文件（JSON/CSV）并回传文本内容 */
        @JavascriptInterface
        public void pickFile(String callbackId, String accept) {
            pendingPickId = callbackId;
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.setType("*/*");
            i.addCategory(Intent.CATEGORY_OPENABLE);
            try {
                startActivityForResult(Intent.createChooser(i, "选择文件"), 1001);
            } catch (Exception e) {
                pendingPickId = null;
            }
        }

        /* 系统打印 / 另存为 PDF */
        @JavascriptInterface
        public void printPdf(final String jobName) {
            runOnUiThread(() -> {
                try {
                    PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                    String name = (jobName == null || jobName.isEmpty()) ? "送货单" : jobName;
                    PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(name);
                    pm.print(name, adapter, new PrintAttributes.Builder().build());
                } catch (Exception e) {
                    toast("打印失败：" + e.getMessage());
                }
            });
        }

        /* 分享文件（图片/PDF）到微信等 */
        @JavascriptInterface
        public void shareFile(final String fileName, final String mime, final String base64) {
            runOnUiThread(() -> {
                try {
                    byte[] data = Base64.decode(base64, Base64.DEFAULT);
                    File dir = new File(getCacheDir(), "shared");
                    if (!dir.exists()) dir.mkdirs();
                    File f = new File(dir, fileName);
                    try (FileOutputStream fos = new FileOutputStream(f)) {
                        fos.write(data);
                    }
                    Uri uri = ShareProvider.uriForFile(MainActivity.this, fileName);
                    Intent send = new Intent(Intent.ACTION_SEND);
                    send.setType((mime == null || mime.isEmpty()) ? "application/octet-stream" : mime);
                    send.putExtra(Intent.EXTRA_STREAM, uri);
                    send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(send, "分享送货单"));
                } catch (Exception e) {
                    toast("分享失败：" + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void exitApp() {
            finish();
        }
    }

    private void toast(final String msg) {
        runOnUiThread(() -> Toast.makeText(this, msg, Toast.LENGTH_LONG).show());
    }
}
