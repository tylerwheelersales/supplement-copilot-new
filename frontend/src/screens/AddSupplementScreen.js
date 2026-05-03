import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { addSupplement, scanSupplement } from '../services/api';

export default function AddSupplementScreen({ navigation }) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    name: '',
    brand: '',
    supplement_type: '',
    servings_per_bottle: '',
    servings_per_day: '1',
    amazon_link: '',
    low_stock_threshold: '7',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function applyScannedData(data) {
    setForm((f) => ({
      ...f,
      name: data.name || f.name,
      brand: data.brand || f.brand,
      supplement_type: data.supplement_type || f.supplement_type,
      servings_per_bottle: data.servings_per_bottle != null ? String(data.servings_per_bottle) : f.servings_per_bottle,
      servings_per_day: data.servings_per_day != null ? String(data.servings_per_day) : f.servings_per_day,
      amazon_link: data.amazon_link || f.amazon_link,
    }));
  }

  async function pickAndScan(useCamera) {
    const permissionFn = useCamera
      ? ImagePicker.requestCameraPermissionsAsync
      : ImagePicker.requestMediaLibraryPermissionsAsync;

    const { granted } = await permissionFn();
    if (!granted) {
      Alert.alert('Permission required', useCamera ? 'Camera access is needed.' : 'Photo library access is needed.');
      return;
    }

    const pickerFn = useCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await pickerFn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]?.base64) return;

    const { base64, mimeType } = result.assets[0];
    setScanning(true);
    setError('');
    try {
      const data = await scanSupplement(token, base64, mimeType || 'image/jpeg');
      applyScannedData(data);
    } catch (err) {
      setError('Scan failed: ' + err.message);
    } finally {
      setScanning(false);
    }
  }

  function promptScanSource() {
    Alert.alert('Add via Photo', 'Choose a photo source', [
      { text: 'Take Photo', onPress: () => pickAndScan(true) },
      { text: 'Choose from Library', onPress: () => pickAndScan(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function handleSave() {
    setError('');
    if (!form.name || !form.servings_per_bottle) {
      setError('Name and servings per bottle are required');
      return;
    }
    setLoading(true);
    try {
      await addSupplement(token, {
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        supplement_type: form.supplement_type.trim() || undefined,
        servings_per_bottle: Number(form.servings_per_bottle),
        servings_per_day: Number(form.servings_per_day),
        amazon_link: form.amazon_link.trim() || undefined,
        low_stock_threshold: Number(form.low_stock_threshold) || 7,
      });
      navigation.goBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Add Supplement</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.scanBtn} onPress={promptScanSource} disabled={scanning}>
          {scanning ? (
            <View style={styles.scanBtnInner}>
              <ActivityIndicator color="#0B0C10" size="small" />
              <Text style={styles.scanBtnText}>  Analyzing photo…</Text>
            </View>
          ) : (
            <Text style={styles.scanBtnText}>📸 Scan Bottle Label</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.divider}>— or fill in manually —</Text>

        <Field label="Name *" placeholder="e.g. Vitamin D3" value={form.name} onChangeText={(v) => set('name', v)} />
        <Field label="Brand" placeholder="e.g. NOW Foods" value={form.brand} onChangeText={(v) => set('brand', v)} />
        <Field label="Type" placeholder="e.g. vitamin, mineral, protein" value={form.supplement_type} onChangeText={(v) => set('supplement_type', v)} />
        <Field label="Servings per bottle *" placeholder="e.g. 120" value={form.servings_per_bottle} onChangeText={(v) => set('servings_per_bottle', v)} keyboardType="numeric" />
        <Field label="Servings per day" placeholder="e.g. 1" value={form.servings_per_day} onChangeText={(v) => set('servings_per_day', v)} keyboardType="numeric" />
        <Field label="Low stock warning (days)" placeholder="7" value={form.low_stock_threshold} onChangeText={(v) => set('low_stock_threshold', v)} keyboardType="numeric" />
        <Field label="Amazon link" placeholder="https://amazon.com/..." value={form.amazon_link} onChangeText={(v) => set('amazon_link', v)} autoCapitalize="none" />

        <TouchableOpacity style={styles.btn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#0B0C10" /> : <Text style={styles.btnText}>Save Supplement</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...inputProps }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#6b7280" {...inputProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0C10' },
  inner: { padding: 24, paddingBottom: 48 },
  heading: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 20 },
  error: { color: '#fca5a5', backgroundColor: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 },
  scanBtn: {
    backgroundColor: '#5eead4',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  scanBtnInner: { flexDirection: 'row', alignItems: 'center' },
  scanBtnText: { color: '#0B0C10', fontWeight: '700', fontSize: 16 },
  divider: { color: '#374151', fontSize: 13, textAlign: 'center', marginBottom: 18 },
  fieldWrap: { marginBottom: 14 },
  label: { color: '#9ca3af', fontSize: 13, marginBottom: 5 },
  input: {
    backgroundColor: '#0D0F13',
    color: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e2027',
    padding: 14,
    fontSize: 15,
  },
  btn: {
    backgroundColor: '#5eead4',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  btnText: { color: '#0B0C10', fontWeight: '700', fontSize: 16 },
  cancelBtn: { alignItems: 'center', padding: 12 },
  cancelText: { color: '#6b7280', fontSize: 15 },
});
