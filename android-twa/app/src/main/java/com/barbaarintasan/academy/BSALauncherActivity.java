package com.barbaarintasan.academy;

import android.net.Uri;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

public class BSALauncherActivity extends LauncherActivity {

    @Override
    protected Uri getLaunchingUrl() {
        return Uri.parse("https://appbarbaarintasan.com/");
    }
}
