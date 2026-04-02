# Bankco React Native SDK

React Native mobile SDK for embedding the Bankco web flow inside a host mobile application.

## Repository Structure

```text
bankco_native_sdk/
├── sdk/
│   ├── BankcoSdkView.js
│   └── package.json
├── example/
│   ├── App.js
│   ├── app.json
│   └── package.json
├── README.md
└── .gitignore
```

## Features

- Integrated native WebView wrapper for Android and iOS
- Automatic query parameter handling for `token`, `mod=sdk`, and optional `card_id`
- Android hardware back button support for in-WebView navigation
- Built-in loading state
- Example host app that demonstrates integration and a live SDK preview flow

## SDK API

`BankcoSdkView` accepts the following props:

- `url`: Base Bankco URL
- `token`: Backend-issued token
- `cardId`: Optional card identifier

## URL Behavior

The SDK automatically appends required query parameters.

Final URL format:

```text
https://rewards.bankco.co.in?token=<token>&mod=sdk&card_id=<cardId>
```

If `cardId` is not provided, the `card_id` parameter is omitted.

## Installation

Add the required dependency to your host app:

```bash
npx expo install react-native-webview
```

Then copy the `sdk/` folder into your project or publish/install it from your internal GitHub workflow.

## Integration

```jsx
import BankcoSdkView from 'bankco-native-sdk';

export default function RewardsScreen() {
  return (
    <BankcoSdkView
      url="https://rewards.bankco.co.in"
      token="your_backend_token"
      cardId="card_123"
    />
  );
}
```

## Platform Notes

### Android

If you must load `http` URLs, enable cleartext traffic in your Android manifest:

```xml
<application android:usesCleartextTraffic="true">
```

### iOS

If you must load `http` URLs, add App Transport Security exceptions:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

### Web

The SDK is designed for native mobile integration. Browser iframe embedding may be blocked by partner site security headers such as CSP `frame-ancestors` or `X-Frame-Options`.

## Example App

The `example/` directory contains a runnable Expo host app with:

- Step-by-step integration guidance
- Usage snippets
- An Example SDK screen
- A back button flow that returns from the SDK preview to the integration guide

Run it with:

```bash
cd example
npm install
npx expo start
```