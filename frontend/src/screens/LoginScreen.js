import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/api';

export default function LoginScreen({ navigation }) {
  const { saveToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    setLoading(true);
    try {
      const { token } = await login(email.trim(), password);
      await saveToken(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <Text style={styles.title}>Supplement Copilot</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#0B0C10" /> : <Text style={styles.btnText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? <Text style={styles.linkAccent}>Register</Text></Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.devBtn} onPress={() => {
          setEmail('test@example.com');
          setPassword('password123');
          login('test@example.com', 'password123').then(({ token }) => saveToken(token)).catch(() => {});
        }}>
          <Text style={styles.devText}>⚡ Dev bypass</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0C10' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#6b7280', fontSize: 15, textAlign: 'center', marginBottom: 32 },
  error: { color: '#fca5a5', backgroundColor: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 },
  input: {
    backgroundColor: '#0D0F13',
    color: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e2027',
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#5eead4',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  btnText: { color: '#0B0C10', fontWeight: '700', fontSize: 16 },
  link: { color: '#6b7280', textAlign: 'center', fontSize: 14 },
  linkAccent: { color: '#5eead4' },
  devBtn: { marginTop: 32, alignItems: 'center' },
  devText: { color: '#374151', fontSize: 13 },
});
