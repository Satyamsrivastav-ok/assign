import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, StyleSheet } from 'react-native';
import { setToken } from './src/api';
import LoansScreen from './src/LoansScreen';
import LoginScreen from './src/LoginScreen';

const TOKEN_KEY = 'miniledger_token';

const getSavedToken = () =>
  Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage.getItem(TOKEN_KEY)) : SecureStore.getItemAsync(TOKEN_KEY);

const saveToken = (token: string) =>
  Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage.setItem(TOKEN_KEY, token))
    : SecureStore.setItemAsync(TOKEN_KEY, token);

const removeSavedToken = () =>
  Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage.removeItem(TOKEN_KEY))
    : SecureStore.deleteItemAsync(TOKEN_KEY);

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let active = true;
    getSavedToken()
      .then((t) => {
        if (active && t) {
          setToken(t);
          setLoggedIn(true);
        }
      })
      .catch((error: unknown) => {
        Alert.alert('Session unavailable', 'Could not restore your saved session. Please log in again.');
        console.error('Could not restore saved session', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const onLogin = async (token: string) => {
    await saveToken(token);
    setToken(token);
    setLoggedIn(true);
  };

  const onLogout = async () => {
    try {
      await removeSavedToken();
      setToken(null);
      setLoggedIn(false);
    } catch (error) {
      Alert.alert('Could not log out', 'The saved session could not be removed. Please try again.');
      console.error('Could not remove saved session', error);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      {loading ? <ActivityIndicator style={{ marginTop: 80 }} /> : loggedIn ? <LoansScreen onLogout={onLogout} /> : <LoginScreen onLogin={onLogin} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: '#f5f6fa', paddingTop: 30 } });
