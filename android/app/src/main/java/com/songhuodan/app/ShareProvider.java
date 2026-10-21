package com.songhuodan.app;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * 极简 ContentProvider：把缓存目录 shared/ 下的文件以 content:// 形式分享出去。
 * 避免引入 androidx 依赖。
 */
public class ShareProvider extends ContentProvider {

    public static Uri uriForFile(Context ctx, String name) {
        File dir = new File(ctx.getCacheDir(), "shared");
        if (!dir.exists()) dir.mkdirs();
        return Uri.parse("content://com.songhuodan.app.fileprovider/" + Uri.encode(name));
    }

    @Override
    public boolean onCreate() { return true; }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File dir = new File(getContext().getCacheDir(), "shared");
        File f = new File(dir, uri.getLastPathSegment());
        if (!f.exists()) throw new FileNotFoundException(uri.toString());
        return ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public String getType(Uri uri) { return "application/octet-stream"; }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        return null;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) { return null; }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) { return 0; }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) { return 0; }
}
