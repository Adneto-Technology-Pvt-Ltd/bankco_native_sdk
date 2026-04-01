import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

import BankcoSdkView from '../sdk/BankcoSdkView';

const EXAMPLE_CONFIG = {
  url: 'https://rewards.bankco.co.in',
  token: 'demo_token_from_backend',
  cardId: 'card_123',
};

const installSnippet = `npx expo install react-native-webview`;

const usageSnippet = `import BankcoSdkView from 'bankco-native-sdk';

export default function RewardsScreen() {
  return (
    <BankcoSdkView
      url="https://rewards.bankco.co.in"
      token="your_backend_token"
      cardId="card_123"
    />
  );
}`;

const steps = [
  'Copy the sdk/ folder into your codebase or install it from your internal package source.',
  'Install react-native-webview in the host app.',
  'Import BankcoSdkView into the screen that should host the Bankco experience.',
  'Pass the base URL, backend token, and optional cardId.',
  'Validate Android back navigation, redirects, and loading states on real devices.',
];

const notes = [
  'The SDK appends token, mod=sdk, and optional card_id automatically.',
  'Use HTTPS in production whenever possible.',
  'If you must use HTTP, update Android and iOS transport security settings.',
  'Browser embedding may be blocked even when native WebView works.',
];

export default function App() {
  const [showExample, setShowExample] = useState(false);

  const finalUrl = useMemo(() => {
    const separator = EXAMPLE_CONFIG.url.includes('?') ? '&' : '?';
    return `${EXAMPLE_CONFIG.url}${separator}token=${encodeURIComponent(
      EXAMPLE_CONFIG.token
    )}&mod=sdk&card_id=${encodeURIComponent(EXAMPLE_CONFIG.cardId)}`;
  }, []);

  if (showExample) {
    return (
      <SafeAreaView style={styles.exampleScreen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.exampleHeader}>
          <Pressable onPress={() => setShowExample(false)} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.exampleTitle}>Example Mobile SDK</Text>
          <Text style={styles.exampleSubtitle}>Live host app preview using BankcoSdkView</Text>
        </View>
        <View style={styles.exampleMeta}>
          <Text style={styles.metaLabel}>Final URL</Text>
          <Text style={styles.metaValue}>{finalUrl}</Text>
        </View>
        <View style={styles.exampleBody}>
          <BankcoSdkView
            cardId={EXAMPLE_CONFIG.cardId}
            token={EXAMPLE_CONFIG.token}
            url={EXAMPLE_CONFIG.url}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Bankco React Native SDK</Text>
          <Text style={styles.heroTitle}>Professional integration guide and sample host app</Text>
          <Text style={styles.heroBody}>
            This example app shows integrators exactly how to wire the SDK, what URL gets
            generated, and how the native WebView experience behaves inside a host application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integration steps</Text>
          {steps.map((step, index) => (
            <View key={step} style={styles.card}>
              <Text style={styles.stepLabel}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={styles.cardBody}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Install command</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{installSnippet}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage example</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{usageSnippet}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Behavior notes</Text>
          {notes.map((note) => (
            <View key={note} style={styles.noteRow}>
              <View style={styles.noteDot} />
              <Text style={styles.noteText}>{note}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Example mobile SDK</Text>
          <Text style={styles.cardBody}>
            Open the hosted example to preview the SDK inside a real app screen. The preview also
            includes a back button so integrators can understand the expected navigation pattern.
          </Text>
          <Pressable onPress={() => setShowExample(true)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Open Example SDK</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F1E8',
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: '#112A46',
    borderRadius: 28,
    padding: 24,
  },
  eyebrow: {
    color: '#BFD7EA',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  heroBody: {
    color: '#D9E7F2',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#112A46',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    padding: 18,
  },
  stepLabel: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  cardBody: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
  },
  codeBlock: {
    backgroundColor: '#0E1B2A',
    borderRadius: 20,
    padding: 18,
  },
  codeText: {
    color: '#FDE68A',
    fontFamily: 'Courier',
    fontSize: 14,
    lineHeight: 21,
  },
  noteRow: {
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 16,
  },
  noteDot: {
    backgroundColor: '#0F766E',
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  noteText: {
    color: '#1F2937',
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#F8B400',
    borderRadius: 16,
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  primaryButtonText: {
    color: '#2C1B00',
    fontSize: 15,
    fontWeight: '800',
  },
  exampleScreen: {
    backgroundColor: '#0B1220',
    flex: 1,
  },
  exampleHeader: {
    backgroundColor: '#112A46',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8B400',
    borderRadius: 999,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#2C1B00',
    fontSize: 14,
    fontWeight: '800',
  },
  exampleTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  exampleSubtitle: {
    color: '#C8D7E4',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  exampleMeta: {
    backgroundColor: '#FFF8E5',
    borderRadius: 20,
    margin: 16,
    padding: 16,
  },
  metaLabel: {
    color: '#7C2D12',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  exampleBody: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
});
