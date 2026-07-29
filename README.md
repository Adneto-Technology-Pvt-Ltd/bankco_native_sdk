# bankco-native-sdk

React Native SDK for embedding the Bankco web rewards flow inside a host
mobile app via an in-app WebView, using a backend-generated token instead of
a login screen.

`BankcoSdkView` handles the WebView lifecycle (loading state, timeout,
error state, Android back button), builds the final SDK URL for you, and
hands off things a bare WebView can't do itself: UPI/wallet payment app
links, and the device's location permission for offline-offer redemption.
Your app owns the screen, navigation, and layout around it.

## Requirements

- `react` `>=18`, `react-native` `>=0.72`, `react-native-webview` `>=13`
- Android and iOS. On web, `BankcoSdkView` renders a fallback with a button
  that opens the final URL in the system browser instead of attempting (and
  failing) to render a WebView.

## Install

```bash
npm install bankco-native-sdk
npx expo install react-native-webview
```

Or directly from GitHub:

```bash
npm install github:Adneto-Technology-Pvt-Ltd/bankco_native_sdk
```

## Quick start

```jsx
import { View } from 'react-native';
import BankcoSdkView from 'bankco-native-sdk';

export default function RewardsScreen() {
  return (
    <View style={{ flex: 1 }}>
      <BankcoSdkView
        url="https://your-domain.bankco.co.in"
        token="yourBackendToken"
        cardId="card_123" // omit if you don't have one
      />
    </View>
  );
}
```

That's the entire integration surface: get a `url` and `token` from your own
backend/config, pass them (plus `cardId` if you have one) to
`BankcoSdkView`, and render it inside a `flex: 1` container.

## Integration model

- Your app creates the screen or container - `BankcoSdkView` fills the
  available parent space, it does not push its own screen or own
  navigation.
- Use a dedicated screen with `flex: 1` for a full-screen SDK experience.
- On Android, the hardware back button steps back through WebView history
  when there is any; otherwise it falls through to your app's normal back
  handling (e.g. React Navigation popping the screen).

## Props

| Prop | Required | Description |
|---|---|---|
| `url` | Yes | Base Bankco URL |
| `token` | Yes | Backend-issued session token |
| `cardId` | No | Card identifier, sent as `card_id` |
| `debug` | No | Shows SDK diagnostics (last event, final URL) in the loading/error states. Default `false` |
| `timeoutMs` | No | Initial load timeout in milliseconds. Default `15000` |
| `onLoadStateChange` | No | Callback for load/navigation/timeout events: `({ type, finalUrl, ... }) => void` |
| `onError` | No | Callback for WebView, HTTP, timeout, and external-link errors: `({ type, finalUrl, ... }) => void` |

## URL behavior

The SDK builds the final URL by taking `url` and appending:

- `token=<token>` - the value you passed
- `mod=mobsdk` - added automatically so the web flow can detect it's running
  inside the mobile SDK (case-insensitive on the web side)
- `card_id=<cardId>` - only when `cardId` is provided

```text
https://your-domain.bankco.co.in?token=<token>&mod=mobsdk&card_id=<cardId>
```

Pass the base Bankco URL in `url`, not a fully assembled URL - don't append
`token`/`mod`/`card_id` yourself.

## Platform setup

None of this is needed if your `url` is HTTPS and you have no offline
offers or paid (PayU) offers. Add only what applies to you.

### HTTP URLs (cleartext / ATS)

If `url` is `http://` rather than `https://`, both platforms block it by
default:

- **Android**: in host app `android/app/src/main/AndroidManifest.xml`:

  ```xml
  <application
      android:label="your_app_name"
      android:usesCleartextTraffic="true">
  ```

- **iOS**: in host app `ios/Runner/Info.plist` (or the equivalent in your
  Expo `app.json` under `ios.infoPlist`):

  ```xml
  <key>NSAppTransportSecurity</key>
  <dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
  </dict>
  ```

Prefer moving your production URL to HTTPS where possible - geolocation
(below) requires it regardless of this setting.

### Location permission (offline-offer redemption)

Redeeming an **offline** (in-store) offer calls `navigator.geolocation` from
inside the web flow to confirm the user is near a participating store. On a
normal website the browser shows its own permission popup automatically;
inside a native WebView there's no such built-in popup.

- **Android**: declare the location permission in host app
  `android/app/src/main/AndroidManifest.xml` (or `app.json`'s
  `android.permissions` for Expo):

  ```xml
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
  ```

  Setting `geolocationEnabled` on `BankcoSdkView` is fully sufficient by
  itself - `react-native-webview`'s own native `WebChromeClient` already
  checks `ACCESS_FINE_LOCATION` and, if not yet granted, triggers the
  Android system permission dialog itself (via `Activity.requestPermissions`)
  the first time the web flow calls `navigator.geolocation`. No in-app
  permission request needs to be layered on top of this - and adding one
  can cause its own problems, since Android only allows one permission
  request in flight per Activity at a time, and a competing request could
  collide with the WebView's own.

  `BankcoSdkView` only *checks* (never requests) the current status on
  mount, reported via `onLoadStateChange` as `locationPermission:check`, so
  you can see in `debug` mode whether the OS already holds a grant/denial
  before the WebView even asks.

  Geolocation also requires a **secure origin** - Android's WebView denies
  it outright on plain `http://` URLs (localhost excepted), regardless of
  permissions.

  **If permission is confirmed granted (in device Settings) and it's still
  not working**: the remaining causes are outside this SDK's control -
  either the device/emulator has no real GPS fix (confirm Location Services
  is genuinely on, not just permitted; on an emulator, set a location under
  Extended Controls), or Google Play Services' location provider is
  unavailable, which Android WebView's geolocation implementation depends on
  even when every permission is granted.

  **Testing in Expo Go**: Expo Go is a pre-built app - it does not read your
  project's `app.json` permissions or config plugins at all, and its own
  location-permission grant/deny state is shared across every project
  you've ever tested through it on that device. If it was denied once
  (even in an unrelated project), no dialog will show again until you reset
  it in Android Settings → Apps → Expo Go → Permissions, or reinstall Expo
  Go. For a test that matches your real app's manifest, use a custom dev
  build (`npx expo run:android` or an EAS development build) instead.

- **iOS**: add the usage description to host app `ios/Runner/Info.plist`
  (or `app.json`'s `ios.infoPlist` for Expo):

  ```xml
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>We use your location to verify you're near a participating store when redeeming an offline offer.</string>
  ```

  `WKWebView` bridges `navigator.geolocation` to Core Location and shows the
  system prompt automatically once this key is present - no extra code is
  needed on iOS.

### UPI/wallet app hand-off (paid offers via PayU)

PayU's hosted checkout completes UPI and some wallet payments by navigating
to an app deep link instead of a web page (e.g. `upi://pay?pa=...&pn=...`).
A normal mobile browser hands links like this off to the OS, which opens
whichever matching app is installed; a bare WebView does not, and instead
fails to load it. `BankcoSdkView` already intercepts any non-http(s)
navigation via `onShouldStartLoadWithRequest` and opens it with
`Linking.openURL` instead of trying to load it - but both platforms
restrict which app-scheme lookups they'll answer, so the host app still
needs to declare them:

- **Android** (11+ package visibility): add to host app
  `android/app/src/main/AndroidManifest.xml`, inside a top-level `<queries>`
  block:

  ```xml
  <queries>
    <intent>
      <action android:name="android.intent.action.VIEW"/>
      <data android:scheme="upi"/>
    </intent>
    <!-- repeat the <intent> block for tez, phonepe, paytmmp, credpay, bhim,
         or any other scheme your PayU configuration can hand off to -->
  </queries>
  ```

- **iOS**: add to host app `ios/Runner/Info.plist`:

  ```xml
  <key>LSApplicationQueriesSchemes</key>
  <array>
    <string>upi</string>
    <string>tez</string>
    <string>phonepe</string>
    <string>paytmmp</string>
    <string>credpay</string>
    <string>bhim</string>
  </array>
  ```

Without these, `Linking.canOpenURL` reports the app as not installed even
when it is, and `onError` fires with `type: 'externalLinkUnsupported'`
instead of the payment app opening. If no matching app is installed at all,
that's expected - the user needs a UPI app on the device to pay that way.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Page never loads over `http://` | Cleartext/ATS blocked by the OS | [HTTP URLs](#http-urls-cleartext--ats) |
| No location prompt appears; offline-offer redemption fails | Missing manifest/Info.plist declarations, or testing over `http://` | [Location permission](#location-permission-offline-offer-redemption) |
| No location prompt in Expo Go specifically, even with declarations in place | Expo Go ignores your app's manifest/config and remembers denials across every project tested through it | See "Testing in Expo Go" under [Location permission](#location-permission-offline-offer-redemption) |
| Permission confirmed granted (Settings shows it on), HTTPS URL, but offline-offer redemption still doesn't work | No real GPS fix (device/emulator) or Google Play Services location provider unavailable - both outside the SDK's control | See the "still not working" note under [Location permission](#location-permission-offline-offer-redemption) |
| `onError` fires with `type: 'externalLinkUnsupported'` during PayU checkout | Missing `<queries>` (Android) / `LSApplicationQueriesSchemes` (iOS) declarations | [UPI/wallet app hand-off](#upiwallet-app-hand-off-paid-offers-via-payu) |
| `onError` fires with `type: 'externalLinkUnsupported'` and the declarations above are already in place | No app installed on the device for that payment scheme - not a bug | Same as above |

## Notes

- Generate the token on your backend per user session; don't hardcode it.
- Browser embedding (Flutter Web / React Native Web) may be blocked by
  partner site security headers even when native WebView works fine.
- The SDK does not create or push its own native screen automatically - see
  [Integration model](#integration-model).

## Publish

Publish from the repo root:

```bash
npm login
npm publish
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes.
