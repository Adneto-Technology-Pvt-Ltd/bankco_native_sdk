import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, BackHandler, Linking, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const SDK_MODE = 'mobsdk';
const DEFAULT_TIMEOUT_MS = 15000;
const READY_MESSAGE_SOURCE = 'bankco-native-sdk';
const READY_SCRIPT = `
  (function () {
    var hasPosted = false;

    function post(type) {
      if (hasPosted) {
        return;
      }

      hasPosted = true;

      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            source: '${READY_MESSAGE_SOURCE}',
            type: type,
            href: window.location.href,
            readyState: document.readyState
          })
        );
      }
    }

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      post('dom-ready');
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        post('dom-ready');
      }, { once: true });
      window.addEventListener('load', function () {
        post('window-load');
      }, { once: true });
    }

    setTimeout(function () {
      post('ready-fallback');
    }, 4000);
  })();
  true;
`;

function buildSdkUrl(url, token, cardId) {
  const separator = url.includes('?') ? '&' : '?';
  let finalUrl = `${url}${separator}token=${encodeURIComponent(token)}&mod=${SDK_MODE}`;

  if (cardId) {
    finalUrl += `&card_id=${encodeURIComponent(cardId)}`;
  }

  return finalUrl;
}

function getErrorDescription(nativeEvent) {
  return nativeEvent?.description || nativeEvent?.code || 'Unknown WebView error';
}

function parseMessage(data) {
  try {
    return JSON.parse(data);
  } catch (_error) {
    return null;
  }
}

export default function BankcoSdkView({
  url,
  token,
  cardId,
  debug = false,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  onLoadStateChange,
  onError,
}) {
  const webViewRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const hasCompletedInitialLoadRef = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastEvent, setLastEvent] = useState('idle');
  const finalUrl = useMemo(() => buildSdkUrl(url, token, cardId), [cardId, token, url]);

  const reportState = useCallback(
    (type, details = {}) => {
      setLastEvent(type);
      onLoadStateChange?.({ type, finalUrl, ...details });

      if (debug) {
        console.log('BankcoSdkView', type, { finalUrl, ...details });
      }
    },
    [debug, finalUrl, onLoadStateChange]
  );

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const completeInitialLoad = useCallback(
    (type, details = {}) => {
      clearLoadTimeout();
      hasCompletedInitialLoadRef.current = true;
      setIsLoading(false);
      reportState(type, details);
    },
    [clearLoadTimeout, reportState]
  );

  const startLoadTimeout = useCallback(() => {
    clearLoadTimeout();
    loadTimeoutRef.current = setTimeout(() => {
      reportState(`timeout:${timeoutMs}ms`);
      setIsLoading(false);
      setErrorMessage(
        `The SDK page did not finish loading within ${Math.round(
          timeoutMs / 1000
        )} seconds. This usually indicates a redirect loop, SSL issue, or network problem.`
      );
      onError?.({ type: 'timeout', finalUrl, timeoutMs });
    }, timeoutMs);
  }, [clearLoadTimeout, finalUrl, onError, reportState, timeoutMs]);

  const handleAndroidBackPress = useCallback(() => {
    if (Platform.OS === 'android' && canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }

    return false;
  }, [canGoBack]);

  useEffect(() => {
    hasCompletedInitialLoadRef.current = false;
    setCanGoBack(false);
    setIsLoading(true);
    setErrorMessage('');
    setLastEvent('idle');
    clearLoadTimeout();
  }, [clearLoadTimeout, finalUrl]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleAndroidBackPress
    );

    return () => subscription.remove();
  }, [handleAndroidBackPress]);

  useEffect(() => () => clearLoadTimeout(), [clearLoadTimeout]);

  // Offline-offer redemption calls navigator.geolocation from the web flow.
  // geolocationEnabled below is fully sufficient on its own: react-native-
  // webview's own native WebChromeClient.onGeolocationPermissionsShowPrompt
  // already checks ACCESS_FINE_LOCATION and, if not yet granted, calls
  // Activity.requestPermissions() itself - the system dialog appears without
  // any app code, and once resolved it grants (or denies) the WebView's
  // request directly. iOS's WKWebView does the equivalent via Core Location
  // once Info.plist declares NSLocationWhenInUseUsageDescription. No prior
  // in-app permission request is required or should be added here - a
  // second, separate PermissionsAndroid.request() call racing the WebView's
  // own internal one can collide, since Android only allows one
  // requestPermissions() call in flight per Activity at a time.
  //
  // This effect only *checks* (never requests) current status, reported via
  // reportState/onLoadStateChange as `locationPermission:check`, so you can
  // see in `debug` mode whether the OS already holds a grant/denial before
  // the WebView even asks. If this reports granted: true and offline-offer
  // redemption still doesn't work, the remaining likely causes are outside
  // this SDK's control: the device/emulator has no real GPS fix (check
  // Location Services is genuinely on, not just permitted, and that an
  // emulator has a location set under Extended Controls), or Google Play
  // Services' location provider is unavailable - Android WebView's
  // geolocation implementation depends on it even when every permission is
  // granted.
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
      .then((granted) => {
        reportState('locationPermission:check', { granted });
      })
      .catch((error) => {
        reportState('locationPermission:error', { error: String(error) });
      });
  }, [reportState]);

  // PayU hands off UPI/wallet payment approval by navigating to an app deep
  // link (upi://, tez://, phonepe://, ...) instead of a web page. The
  // WebView can't load that itself - returning false here stops it from
  // trying, and Linking.openURL hands it to the OS the same way a normal
  // mobile browser would.
  const handleShouldStartLoad = useCallback(
    (request) => {
      const requestUrl = request?.url || '';

      if (/^https?:\/\//i.test(requestUrl) || requestUrl === 'about:blank') {
        return true;
      }

      Linking.canOpenURL(requestUrl)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(requestUrl);
          }
          reportState('externalLinkUnsupported', { url: requestUrl });
          onError?.({ type: 'externalLinkUnsupported', finalUrl, url: requestUrl });
          return undefined;
        })
        .catch((error) => {
          reportState('externalLinkError', { url: requestUrl, error: String(error) });
        });

      return false;
    },
    [finalUrl, onError, reportState]
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webFallback}>
        <Text style={styles.webFallbackTitle}>Mobile SDK preview is native-first</Text>
        <Text style={styles.webFallbackBody}>
          The Bankco SDK is intended for Android and iOS WebView integration. Browser embedding may
          be blocked by partner site security headers.
        </Text>
        <Pressable onPress={() => Linking.openURL(finalUrl)} style={styles.webFallbackButton}>
          <Text style={styles.webFallbackButtonText}>Open Final URL in Browser</Text>
        </Pressable>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorTitle}>Unable to load Bankco SDK</Text>
        <Text style={styles.errorBody}>{errorMessage}</Text>
        {debug ? (
          <>
            <Text style={styles.errorUrlLabel}>Last Event</Text>
            <Text style={styles.errorUrlValue}>{lastEvent}</Text>
            <Text style={styles.errorUrlLabel}>Final URL</Text>
            <Text style={styles.errorUrlValue}>{finalUrl}</Text>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: finalUrl }}
        startInLoadingState
        injectedJavaScriptBeforeContentLoaded={READY_SCRIPT}
        onLoadStart={(event) => {
          const nextUrl = event.nativeEvent?.url || finalUrl;
          setErrorMessage('');
          reportState('loadStart', { url: nextUrl });

          if (!hasCompletedInitialLoadRef.current) {
            setIsLoading(true);
            startLoadTimeout();
          }
        }}
        onLoadEnd={(event) => {
          const nextUrl = event.nativeEvent?.url || finalUrl;

          if (!hasCompletedInitialLoadRef.current) {
            completeInitialLoad('loadEnd', { url: nextUrl });
            return;
          }

          reportState('loadEnd', { url: nextUrl });
        }}
        onMessage={(event) => {
          const payload = parseMessage(event.nativeEvent?.data);

          if (!payload || payload.source !== READY_MESSAGE_SOURCE) {
            return;
          }

          if (!hasCompletedInitialLoadRef.current) {
            completeInitialLoad(payload.type || 'message', payload);
            return;
          }

          reportState(payload.type || 'message', payload);
        }}
        onError={(event) => {
          clearLoadTimeout();
          const description = getErrorDescription(event.nativeEvent);
          reportState('error', { description, nativeEvent: event.nativeEvent });
          setIsLoading(false);
          setErrorMessage(description);
          onError?.({ type: 'error', finalUrl, nativeEvent: event.nativeEvent, description });
        }}
        onHttpError={(event) => {
          clearLoadTimeout();
          reportState('httpError', {
            statusCode: event.nativeEvent.statusCode,
            nativeEvent: event.nativeEvent,
          });
          setIsLoading(false);
          setErrorMessage(`HTTP ${event.nativeEvent.statusCode} while loading the SDK page.`);
          onError?.({
            type: 'httpError',
            finalUrl,
            nativeEvent: event.nativeEvent,
            statusCode: event.nativeEvent.statusCode,
          });
        }}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          reportState('navigation', { url: navState.url, canGoBack: navState.canGoBack });
        }}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        javaScriptEnabled
        javaScriptCanOpenWindowsAutomatically
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        geolocationEnabled
        style={styles.webview}
      />

      {isLoading ? (
        <View pointerEvents="none" style={styles.loader}>
          <ActivityIndicator color="#F8B400" size="large" />
          {debug ? (
            <>
              <Text style={styles.loaderText}>Loading Bankco SDK</Text>
              <Text style={styles.loaderMeta}>{lastEvent}</Text>
              <Text numberOfLines={3} style={styles.loaderMeta}>
                {finalUrl}
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loaderText: {
    color: '#112A46',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  loaderMeta: {
    color: '#4B5563',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  webFallback: {
    alignItems: 'center',
    backgroundColor: '#FFF8E5',
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  webFallbackTitle: {
    color: '#112A46',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  webFallbackBody: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
    textAlign: 'center',
  },
  webFallbackButton: {
    backgroundColor: '#F8B400',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  webFallbackButtonText: {
    color: '#2C1B00',
    fontSize: 14,
    fontWeight: '800',
  },
  errorState: {
    backgroundColor: '#FFF8E5',
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#7C2D12',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  errorBody: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
  },
  errorUrlLabel: {
    color: '#7C2D12',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 18,
    textTransform: 'uppercase',
  },
  errorUrlValue: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});
