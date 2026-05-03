import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getSupplements, logIntake } from '../services/api';

export default function SupplementsScreen({ navigation }) {
  const { token, clearToken } = useAuth();
  const [supplements, setSupplements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Refresh list every time this screen comes into focus (e.g. after adding one)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getSupplements(token).then((data) => {
        setSupplements(data);
        setLoading(false);
      });
    }, [token])
  );

  async function handleLogIntake(supplement) {
    try {
      await logIntake(token, supplement.id);
      // Optimistically update remaining_servings in the list
      setSupplements((prev) =>
        prev.map((s) =>
          s.id === supplement.id
            ? {
                ...s,
                remaining_servings: Math.max(0, s.remaining_servings - s.servings_per_day),
                days_remaining: Math.max(0, s.days_remaining - 1),
              }
            : s
        )
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5eead4" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Supplements</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.coachBtn} onPress={() => navigation.navigate('Recommendation')}>
            <Text style={styles.coachBtnText}>✦ AI Coach</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddSupplement')}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearToken} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {supplements.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No supplements yet.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddSupplement')}>
            <Text style={styles.emptyLink}>Add your first one →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={supplements}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <SupplementCard supplement={item} onLogIntake={() => handleLogIntake(item)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function SupplementCard({ supplement, onLogIntake }) {
  const isLowStock = supplement.days_remaining <= supplement.low_stock_threshold;

  return (
    <View style={[styles.card, isLowStock && styles.cardLowStock]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{supplement.name}</Text>
          {supplement.brand ? <Text style={styles.brand}>{supplement.brand}</Text> : null}
        </View>
        {isLowStock && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Low Stock</Text>
          </View>
        )}
      </View>

      <View style={styles.stats}>
        <Stat label="Remaining" value={`${Math.max(0, Math.round(supplement.remaining_servings))}`} />
        <Stat label="Days left" value={supplement.days_remaining != null ? `~${Math.max(0, supplement.days_remaining)}d` : '—'} />
        <Stat label="Per day" value={`${supplement.servings_per_day}x`} />
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.logBtn} onPress={onLogIntake}>
          <Text style={styles.logBtnText}>✓ Log Intake</Text>
        </TouchableOpacity>
        {isLowStock && supplement.amazon_link ? (
          <TouchableOpacity style={styles.reorderBtn} onPress={() => Linking.openURL(supplement.amazon_link)}>
            <Text style={styles.reorderBtnText}>Reorder →</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0C10' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0C10' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  heading: { color: '#fff', fontSize: 24, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coachBtn: { backgroundColor: '#1e2027', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#5eead4' },
  coachBtnText: { color: '#5eead4', fontWeight: '600', fontSize: 14 },
  addBtn: { backgroundColor: '#5eead4', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#0B0C10', fontWeight: '700', fontSize: 14 },
  logoutBtn: { padding: 4 },
  logoutText: { color: '#6b7280', fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { color: '#6b7280', fontSize: 16 },
  emptyLink: { color: '#5eead4', fontSize: 15 },
  card: {
    backgroundColor: '#0D0F13',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e2027',
  },
  cardLowStock: { borderColor: '#f87171' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  name: { color: '#fff', fontSize: 17, fontWeight: '600' },
  brand: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  badge: { backgroundColor: '#7f1d1d', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fca5a5', fontSize: 11, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: 20, marginBottom: 14 },
  stat: {},
  statValue: { color: '#5eead4', fontSize: 16, fontWeight: '700' },
  statLabel: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  cardFooter: { flexDirection: 'row', gap: 10 },
  logBtn: {
    flex: 1,
    backgroundColor: '#1e2027',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  logBtnText: { color: '#5eead4', fontWeight: '600', fontSize: 14 },
  reorderBtn: {
    flex: 1,
    backgroundColor: '#5eead4',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reorderBtnText: { color: '#0B0C10', fontWeight: '700', fontSize: 14 },
});
