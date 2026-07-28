## 1.1.1

- The Android location-permission check/request now reports through
  `reportState`/`onLoadStateChange` (`locationPermission:check`,
  `locationPermission:request`, `locationPermission:error`) instead of only
  logging when `debug` is on. "The permission popup never showed" is hard
  to diagnose blind - this makes it visible whether the OS already had a
  denial on record (no dialog will ever appear until that's reset) versus
  the request actually firing and being granted/denied live. Notably, Expo
  Go ignores a project's own `AndroidManifest`/`app.json` permissions
  entirely (it runs its own pre-built manifest) and its permission grant/
  deny state is shared across every project tested through it on a device -
  a prior denial there persists until reset in Android Settings or Expo Go
  is reinstalled, regardless of what this SDK or your app requests.

## 1.1.0

- Fixed offline-offer redemption: `BankcoSdkView` now sets `geolocationEnabled`
  on the underlying WebView and requests the Android runtime location
  permission itself (via `PermissionsAndroid`) so `navigator.geolocation`
  calls from the web flow work the same way they do on a normal website.
  Previously `geolocationEnabled` wasn't set at all, so Android silently
  blocked every geolocation request regardless of permissions. Host apps
  need to add `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION` (Android) and
  `NSLocationWhenInUseUsageDescription` (iOS) - see the README's new
  "Location permission" section.
- Fixed PayU UPI/wallet payment hand-off: PayU completes UPI (and some
  wallet) payments by navigating to an app deep link (e.g.
  `upi://pay?...`), which the WebView can't load. `BankcoSdkView` now
  intercepts any non-http(s) navigation via `onShouldStartLoadWithRequest`
  and opens it with `Linking.openURL` instead, the same hand-off a normal
  mobile browser does automatically. Host apps need to declare the relevant
  schemes for package visibility - see the README's new "UPI/wallet app
  hand-off" section. Unsupported/failed hand-offs now surface through
  `onError` as `type: 'externalLinkUnsupported'` / `'externalLinkError'`.
- Fixed package metadata: `repository`/`bugs`/`homepage` now point at the
  actual org repo (`Adneto-Technology-Pvt-Ltd/bankco_native_sdk`) instead
  of a personal fork URL.
- Rewrote the README with a single linear integration path (install → quick
  start → props → URL behavior → platform setup → troubleshooting), and
  documented the platform setup this release requires.

## 1.0.3

- Prior release: `BankcoSdkView` with loading/error/timeout states, Android
  back button handling, and automatic `token`/`mod=mobsdk`/`card_id` URL
  construction.
