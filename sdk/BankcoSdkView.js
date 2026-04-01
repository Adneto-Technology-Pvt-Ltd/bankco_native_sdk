import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

function buildSdkUrl(url, token, cardId) {
  const separator = url.includes('?') ? '&' : '?';
  let finalUrl = `${url}${separator}token=${encodeURIComponent(token)}&mod=sdk`;

  if (cardId) {
    finalUrl += `&card_id=${encodeURIComponent(cardId)}`;
  }

  return finalUrl;
}

export default function BankcoSdkView({ url, token, cardId }) {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const finalUrl = useMemo(() => buildSdkUrl(url, token, cardId), [cardId, token, url]);

  const handleAndroidBackPress = useCallback(() => {
    if (Platform.OS === 'android' && canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }

    return false;
  }, [canGoBack]);

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
        <Text style={styles.errorUrlLabel}>Final URL</Text>
        <Text style={styles.errorUrlValue}>{finalUrl}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: finalUrl }}
        startInLoadingState
        onLoadStart={() => {
          setErrorMessage('');
          setIsLoading(true);
        }}
        onLoadEnd={() => setIsLoading(false)}
        onError={(event) => {
          setIsLoading(false);
          setErrorMessage(event.nativeEvent.description || 'Unknown WebView error');
        }}
        onHttpError={(event) => {
          setIsLoading(false);
          setErrorMessage(`HTTP ${event.nativeEvent.statusCode} while loading the SDK page.`);
        }}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        style={styles.webview}
      />

      {isLoading ? (
        <View pointerEvents="none" style={styles.loader}>
          <ActivityIndicator color="#F8B400" size="large" />
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
