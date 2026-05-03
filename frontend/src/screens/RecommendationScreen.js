import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getRecommendation } from '../services/api';

export default function RecommendationScreen({ navigation }) {
  const { token } = useAuth();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchPlan() {
    setLoading(true);
    setError('');
    setPlan(null);
    try {
      const { plan } = await getRecommendation(token);
      setPlan(plan);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Refresh whenever we return to this screen (e.g. after editing profile)
  useFocusEffect(
    useCallback(() => {
      fetchPlan();
    }, [token])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Your Supplement Plan</Text>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#5eead4" size="large" />
            <Text style={styles.loadingTitle}>Analyzing your profile…</Text>
            <Text style={styles.loadingSubtitle}>This takes about 10–15 seconds</Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchPlan}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && plan && (
          <>
            {/* Summary */}
            <Section title="Overview">
              <Text style={styles.summaryText}>{plan.summary}</Text>
            </Section>

            {/* Stack evaluation — only show if user has a stack */}
            {(plan.stackEvaluation?.keep?.length > 0 || plan.stackEvaluation?.reconsider?.length > 0) && (
              <Section title="Your Current Stack">
                {plan.stackEvaluation.keep?.length > 0 && (
                  <View style={styles.evalGroup}>
                    <Text style={styles.evalLabel}>✓  Keep</Text>
                    {plan.stackEvaluation.keep.map((item, i) => (
                      <Text key={i} style={styles.evalItem}>• {item}</Text>
                    ))}
                  </View>
                )}
                {plan.stackEvaluation.reconsider?.length > 0 && (
                  <View style={[styles.evalGroup, { marginTop: 12 }]}>
                    <Text style={[styles.evalLabel, styles.evalLabelWarn]}>↺  Reconsider</Text>
                    {plan.stackEvaluation.reconsider.map((item, i) => (
                      <Text key={i} style={styles.evalItem}>• {item}</Text>
                    ))}
                  </View>
                )}
              </Section>
            )}

            {/* Foundations */}
            {plan.foundations?.length > 0 && (
              <Section title="Foundations" badge="Essential">
                {plan.foundations.map((s, i) => (
                  <SupplementCard key={i} item={s} />
                ))}
              </Section>
            )}

            {/* Nice to have */}
            {plan.niceToHave?.length > 0 && (
              <Section title="Nice to Have" badge="Optional" badgeDim>
                {plan.niceToHave.map((s, i) => (
                  <SupplementCard key={i} item={s} dim />
                ))}
              </Section>
            )}

            {/* Diet habits */}
            {plan.dietHabits?.length > 0 && (
              <Section title="Diet Habits to Try">
                {plan.dietHabits.map((habit, i) => (
                  <View key={i} style={styles.habitRow}>
                    <View style={styles.habitNum}>
                      <Text style={styles.habitNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.habitText}>{habit}</Text>
                  </View>
                ))}
              </Section>
            )}

            {/* Disclaimer */}
            <View style={styles.disclaimerCard}>
              <Text style={styles.disclaimerText}>
                ⚠️ {plan.disclaimer || 'This is general educational information, not personalized medical advice. Consult a healthcare professional before starting any new supplement.'}
              </Text>
            </View>
          </>
        )}

        {/* Actions */}
        {!loading && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={() => navigation.navigate('Onboarding', { mode: 'edit' })}
            >
              <Text style={styles.updateBtnText}>✎  Update My Answers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchPlan}>
              <Text style={styles.refreshText}>↺  Regenerate Plan</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, badge, badgeDim, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {badge && (
          <View style={[styles.badge, badgeDim && styles.badgeDim]}>
            <Text style={[styles.badgeText, badgeDim && styles.badgeTextDim]}>{badge}</Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

function SupplementCard({ item, dim }) {
  return (
    <View style={[styles.suppCard, dim && styles.suppCardDim]}>
      <View style={styles.suppCardTop}>
        <Text style={[styles.suppName, dim && styles.suppNameDim]}>{item.name}</Text>
        <View style={[styles.timingChip, dim && styles.timingChipDim]}>
          <Text style={[styles.timingText, dim && styles.timingTextDim]}>🕐 {item.timing}</Text>
        </View>
      </View>
      <Text style={styles.suppRationale}>{item.rationale}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0C10' },
  inner: { padding: 20, paddingBottom: 60 },
  heading: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 20 },

  // Loading
  loadingWrap: { alignItems: 'center', paddingTop: 80, gap: 14 },
  loadingTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  loadingSubtitle: { color: '#6b7280', fontSize: 13 },

  // Error
  errorCard: { backgroundColor: '#7f1d1d', borderRadius: 12, padding: 16, marginBottom: 16 },
  errorText: { color: '#fca5a5', fontSize: 14, marginBottom: 12 },
  retryBtn: { backgroundColor: '#991b1b', borderRadius: 8, padding: 12, alignItems: 'center' },
  retryText: { color: '#fca5a5', fontWeight: '600' },

  // Sections
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  badge: { backgroundColor: '#134e4a', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeDim: { backgroundColor: '#1e2027' },
  badgeText: { color: '#5eead4', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  badgeTextDim: { color: '#6b7280' },

  // Summary
  summaryText: {
    color: '#d1d5db',
    fontSize: 15,
    lineHeight: 24,
    backgroundColor: '#0D0F13',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#5eead4',
    padding: 16,
  },

  // Stack evaluation
  evalGroup: {},
  evalLabel: { color: '#5eead4', fontSize: 13, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  evalLabelWarn: { color: '#f59e0b' },
  evalItem: { color: '#d1d5db', fontSize: 14, lineHeight: 22, paddingLeft: 4 },

  // Supplement cards
  suppCard: {
    backgroundColor: '#0D0F13',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2027',
    padding: 14,
    marginBottom: 10,
  },
  suppCardDim: { borderColor: '#161820', opacity: 0.85 },
  suppCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, gap: 10 },
  suppName: { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1 },
  suppNameDim: { color: '#9ca3af' },
  timingChip: { backgroundColor: '#134e4a', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  timingChipDim: { backgroundColor: '#1e2027' },
  timingText: { color: '#5eead4', fontSize: 11, fontWeight: '600' },
  timingTextDim: { color: '#6b7280' },
  suppRationale: { color: '#9ca3af', fontSize: 13, lineHeight: 20 },

  // Diet habits
  habitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  habitNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#134e4a',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  habitNumText: { color: '#5eead4', fontSize: 12, fontWeight: '700' },
  habitText: { color: '#d1d5db', fontSize: 14, lineHeight: 22, flex: 1 },

  // Disclaimer
  disclaimerCard: {
    backgroundColor: '#0D0F13',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e2027',
    padding: 14,
    marginBottom: 8,
  },
  disclaimerText: { color: '#6b7280', fontSize: 12, lineHeight: 18 },

  // Actions
  actions: { gap: 10, marginTop: 8 },
  updateBtn: {
    backgroundColor: '#5eead4',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  updateBtnText: { color: '#0B0C10', fontWeight: '700', fontSize: 15 },
  refreshBtn: {
    borderWidth: 1,
    borderColor: '#1e2027',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  refreshText: { color: '#6b7280', fontSize: 14 },
});
