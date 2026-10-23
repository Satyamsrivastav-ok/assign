import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from './api';

export default function LoginScreen({ onLogin }: { onLogin: (token: string) => Promise<void> }) {
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
      setMessage((e as Error).message);
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
    <View style={s.box}>
      <Text style={s.title}>MiniLedger</Text>
      <Text style={s.sub}>Track money you lend to friends</Text>
      <TextInput style={s.input} placeholder="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} editable={!otpSent} />
      {otpSent && <TextInput style={s.input} placeholder="6-digit OTP" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} />}
      {!otpSent ? (
        <Button title="Send OTP" onPress={sendOtp} disabled={busy} />
      ) : (
        <>
          <Button title="Verify & Login" onPress={verify} disabled={busy} />
          <View style={{ height: 8 }} />
          <Button title="Change phone number" onPress={() => { setOtpSent(false); setOtp(''); }} disabled={busy} />
        </>
      )}
      {message ? <Text accessibilityRole="alert" style={[s.message, messageIsError ? s.error : s.success]}>{message}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { padding: 24, marginTop: 60 },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center' },
  sub: { textAlign: 'center', color: '#666', marginBottom: 24 },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 12, fontSize: 16 },
  message: { marginTop: 12, textAlign: 'center' },
  error: { color: '#b91c1c' },
  success: { color: '#15803d' },
});
