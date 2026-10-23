import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { api } from './api';

export default function LoginScreen({ onLogin }: { onLogin: (token: string) => Promise<void> }) {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage('');
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = () =>
    run(async () => {
      if (!/^\+?\d{10,15}$/.test(phone.trim())) {
        throw new Error('Enter a valid phone number (10-15 digits).');
      }
      await api.requestOtp(phone.trim());
      setOtpSent(true);
      setMessage('OTP sent. Enter the code printed in the backend terminal.');
      setMessageIsError(false);
    });

  const verify = () =>
    run(async () => {
      if (!/^\d{6}$/.test(otp.trim())) {
        throw new Error('Enter the 6-digit OTP.');
      }
      const { token } = await api.verifyOtp(phone.trim(), otp.trim());
      await onLogin(token);
    });

  return (
    <View style={s.background}>
      <View pointerEvents="none" style={[s.orbit, s.orbitTop]} />
      <View pointerEvents="none" style={[s.orbit, s.orbitBottom]} />
      <View style={[s.card, compact && s.cardCompact]}>
        <View style={[s.formPanel, compact && s.formPanelCompact]}>
          <View style={s.brandRow}>
            <View style={s.brandMark}><Text style={s.brandMarkText}>M</Text></View>
            <Text style={s.brand}>MiniLedger</Text>
          </View>
          <View style={s.formContent}>
            <Text style={s.eyebrow}>WELCOME BACK</Text>
            <Text style={s.title}>{otpSent ? 'Verify your number' : 'Money, remembered.'}</Text>
            <Text style={s.subtitle}>
              {otpSent ? `We sent a one-time code to ${phone.trim()}.` : 'Keep track of every loan, repayment, and due date in one place.'}
            </Text>
            <Text style={s.label}>PHONE NUMBER</Text>
            <TextInput
              style={s.input}
              placeholder="+91 98765 43210"
              placeholderTextColor="#9aa3b5"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!otpSent && !busy}
              autoComplete="tel"
            />
            {otpSent && (
              <>
                <Text style={s.label}>6-DIGIT OTP</Text>
                <TextInput
                  style={s.input}
                  placeholder="Enter your OTP"
                  placeholderTextColor="#9aa3b5"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  editable={!busy}
                  autoComplete="one-time-code"
                />
              </>
            )}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [s.primaryButton, pressed && s.buttonPressed, busy && s.buttonDisabled]}
              onPress={otpSent ? verify : sendOtp}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryButtonText}>{otpSent ? 'VERIFY & SIGN IN' : 'SEND ONE-TIME CODE'}</Text>}
            </Pressable>
            {otpSent && (
              <Pressable
                accessibilityRole="button"
                onPress={() => { setOtpSent(false); setOtp(''); setMessage(''); }}
                disabled={busy}
                style={s.secondaryAction}
              >
                <Text style={s.secondaryText}>Use a different phone number</Text>
              </Pressable>
            )}
            {message ? <Text accessibilityRole="alert" style={[s.message, messageIsError ? s.error : s.success]}>{message}</Text> : null}
            <Text style={s.footnote}>No password needed. Your mock OTP is printed in the backend terminal.</Text>
          </View>
          <Text style={s.legal}>PRIVATE BY DESIGN  ·  BUILT FOR YOUR EVERYDAY</Text>
        </View>
        {!compact && (
          <View style={s.storyPanel}>
            <View pointerEvents="none" style={s.storyCircleLarge} />
            <View pointerEvents="none" style={s.storyCircleSmall} />
            <View style={s.storyNav}>
              <Text style={s.storyNavActive}>OVERVIEW</Text>
              <Text style={s.storyNavItem}>HOW IT WORKS</Text>
              <Text style={s.storyNavItem}>HELP</Text>
            </View>
            <View style={s.storyContent}>
              <View style={s.storyIcon}><Text style={s.storyIconText}>₹</Text></View>
              <Text style={s.storyHeading}>A little clarity goes a long way.</Text>
              <Text style={s.storyBody}>See what you’ve lent, what’s been repaid, and what’s coming due — all at a glance.</Text>
              <View style={s.storyRule} />
              <View style={s.storyStatRow}>
                <View><Text style={s.storyStatValue}>01</Text><Text style={s.storyStatLabel}>ADD A LOAN</Text></View>
                <View><Text style={s.storyStatValue}>02</Text><Text style={s.storyStatLabel}>TRACK IT</Text></View>
                <View><Text style={s.storyStatValue}>03</Text><Text style={s.storyStatLabel}>CLOSE IT</Text></View>
              </View>
            </View>
            <Text style={s.storyFooter}>SIMPLE. SECURE. YOURS.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  background: {
    flex: 1,
    minHeight: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    overflow: 'hidden',
    backgroundColor: '#3985f6',
  },
  orbit: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 999 },
  orbitTop: { width: 430, height: 430, top: -265, right: '12%' },
  orbitBottom: { width: 280, height: 280, bottom: -215, left: -110 },
  card: {
    width: '100%',
    maxWidth: 1000,
    minHeight: 570,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#102b59',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.28,
    shadowRadius: 38,
    elevation: 12,
  },
  cardCompact: { maxWidth: 480, minHeight: undefined },
  formPanel: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 54, paddingVertical: 40, backgroundColor: '#fff' },
  formPanelCompact: { paddingHorizontal: 26, paddingVertical: 30 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#3e80f5', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#fff', fontSize: 19, fontWeight: '800' },
  brand: { color: '#151b2e', fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  formContent: { width: '100%', maxWidth: 390, alignSelf: 'center', paddingVertical: 36 },
  eyebrow: { color: '#3477e9', fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 12 },
  title: { color: '#151b2e', fontSize: 31, lineHeight: 38, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: '#7b8497', fontSize: 14, lineHeight: 22, marginTop: 10, marginBottom: 28 },
  label: { color: '#566178', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 8 },
  input: { width: '100%', height: 48, borderWidth: 1, borderColor: '#e2e6ee', borderRadius: 8, paddingHorizontal: 14, marginBottom: 18, color: '#20283a', backgroundColor: '#fbfcfe', fontSize: 14 },
  primaryButton: { height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#367cf0', marginTop: 2 },
  buttonPressed: { opacity: 0.84 },
  buttonDisabled: { opacity: 0.65 },
  primaryButtonText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  secondaryAction: { alignSelf: 'center', paddingVertical: 14 },
  secondaryText: { color: '#3675dd', fontSize: 12, fontWeight: '700' },
  message: { marginTop: 14, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  error: { color: '#b42336' },
  success: { color: '#168052' },
  footnote: { textAlign: 'center', color: '#a0a7b5', fontSize: 11, lineHeight: 17, marginTop: 19 },
  legal: { color: '#a0a7b5', fontSize: 9, letterSpacing: 1.2, fontWeight: '700' },
  storyPanel: { flex: 1, minHeight: 570, padding: 40, justifyContent: 'space-between', overflow: 'hidden', backgroundColor: '#f5f6f8' },
  storyCircleLarge: { position: 'absolute', width: 430, height: 430, top: -210, right: -185, borderWidth: 1, borderColor: '#e1e7f1', borderRadius: 999 },
  storyCircleSmall: { position: 'absolute', width: 250, height: 250, top: -120, right: -95, borderWidth: 1, borderColor: '#e1e7f1', borderRadius: 999 },
  storyNav: { flexDirection: 'row', justifyContent: 'flex-end', gap: 24 },
  storyNavActive: { color: '#397bec', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  storyNavItem: { color: '#7d8595', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  storyContent: { maxWidth: 350, alignSelf: 'center', width: '100%' },
  storyIcon: { width: 55, height: 55, borderRadius: 18, backgroundColor: '#e5efff', alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  storyIconText: { color: '#397bec', fontSize: 28, fontWeight: '800' },
  storyHeading: { color: '#1b2438', fontSize: 29, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8 },
  storyBody: { color: '#7b8494', fontSize: 13, lineHeight: 21, marginTop: 12 },
  storyRule: { height: 1, backgroundColor: '#e1e5eb', marginVertical: 27 },
  storyStatRow: { flexDirection: 'row', justifyContent: 'space-between' },
  storyStatValue: { color: '#397bec', fontSize: 16, fontWeight: '800', marginBottom: 5 },
  storyStatLabel: { color: '#8e96a5', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  storyFooter: { color: '#9ba2af', fontSize: 9, letterSpacing: 1.2, fontWeight: '700' },
});
