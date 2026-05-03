import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getProfile, saveProfile } from '../services/api';

const TOTAL_STEPS = 6;

export default function OnboardingScreen({ route, navigation }) {
  const isEditMode = route?.params?.mode === 'edit';
  const { token, completeProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(isEditMode);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({
    stack_experience: null,
    goal_profile: null,
    training_days_per_week: 4,
    training_style: null,
    experience_level: null,
    sleep_quality_1_5: 3,
    stress_level_1_5: 3,
    caffeine_use: null,
    age_range: null,
    open_to_bloodwork: false,
    family_history_notes: '',
    diet_type: null,
    diet_description: '',
    budget_level: null,
    max_daily_pills: 5,
    avoid_categories: [],
  });

  // In edit mode, pre-fill form with saved profile
  useEffect(() => {
    if (!isEditMode) return;
    getProfile(token)
      .then(saved => {
        if (saved) setProfile(p => ({ ...p, ...saved }));
      })
      .catch(() => {}) // silently ignore — form stays at defaults
      .finally(() => setLoadingProfile(false));
  }, []);

  function set(key, value) {
    setProfile(p => ({ ...p, [key]: value }));
  }

  function toggleAvoid(cat) {
    setProfile(p => ({
      ...p,
      avoid_categories: p.avoid_categories.includes(cat)
        ? p.avoid_categories.filter(c => c !== cat)
        : [...p.avoid_categories, cat],
    }));
  }

  function canAdvance() {
    switch (step) {
      case 0: return !!profile.stack_experience;
      case 1: return !!profile.goal_profile;
      case 2:
        if (profile.goal_profile === 'fitness_performance')
          return !!profile.training_style && !!profile.experience_level;
        if (profile.goal_profile === 'health_energy')
          return !!profile.caffeine_use;
        if (profile.goal_profile === 'longevity')
          return !!profile.age_range;
        return true;
      case 3: return !!profile.diet_type;
      case 4: return true;
      case 5: return !!profile.budget_level;
      default: return true;
    }
  }

  async function handleNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveProfile(token, profile);
      if (isEditMode) {
        navigation.goBack();
      } else {
        await completeProfile();
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 }}>
          <ActivityIndicator color="#5eead4" size="large" />
          <Text style={{ color: '#6b7280', fontSize: 14 }}>Loading your answers…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.screenTitle}>{isEditMode ? 'Update Your Answers' : 'Get Your Plan'}</Text>

      <View style={styles.progressRow}>
        <Text style={styles.stepLabel}>Step {step + 1} of {TOTAL_STEPS}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {step === 0 && <StepStack profile={profile} set={set} />}
        {step === 1 && <StepGoal profile={profile} set={set} />}
        {step === 2 && <StepLifestyle profile={profile} set={set} />}
        {step === 3 && <StepDietType profile={profile} set={set} />}
        {step === 4 && <StepDietDesc profile={profile} set={set} />}
        {step === 5 && <StepConstraints profile={profile} set={set} toggleAvoid={toggleAvoid} />}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.navRow}>
          {step > 0 ? (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <TouchableOpacity
            style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canAdvance() || saving}
          >
            {saving ? (
              <ActivityIndicator color="#0B0C10" />
            ) : (
              <Text style={styles.nextText}>
                {step === TOTAL_STEPS - 1
                  ? isEditMode ? 'Save & Refresh Plan' : 'Finish Setup'
                  : 'Next →'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Step components ───────────────────────────────────────────────────────

function StepStack({ profile, set }) {
  const options = [
    { value: 'have_stack_confident', label: "I already have a supplement stack and know what I'm doing" },
    { value: 'have_stack_unsure', label: "I have a stack but I'm not sure it's good" },
    { value: 'no_stack_some_knowledge', label: "I don't have a stack but I kind of know what I'm doing" },
    { value: 'no_stack_no_knowledge', label: "I don't have a stack and I don't really know what I'm doing" },
  ];
  const hasStack = profile.stack_experience?.startsWith('have_stack');

  return (
    <View>
      <Text style={styles.question}>Which describes you best right now?</Text>
      {options.map(o => (
        <ChoiceCard
          key={o.value}
          label={o.label}
          selected={profile.stack_experience === o.value}
          onPress={() => set('stack_experience', o.value)}
        />
      ))}
      {hasStack && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            📋 After setup, you can scan or add your current supplements from the main screen.
          </Text>
        </View>
      )}
    </View>
  );
}

function StepGoal({ profile, set }) {
  const options = [
    { value: 'fitness_performance', label: '🏋️  Fitness & performance' },
    { value: 'health_energy', label: '⚡  Health & daily energy' },
    { value: 'longevity', label: '🌿  Longevity' },
  ];

  return (
    <View>
      <Text style={styles.question}>What's your main focus right now?</Text>
      {options.map(o => (
        <ChoiceCard
          key={o.value}
          label={o.label}
          selected={profile.goal_profile === o.value}
          onPress={() => set('goal_profile', o.value)}
        />
      ))}
    </View>
  );
}

function StepLifestyle({ profile, set }) {
  if (profile.goal_profile === 'fitness_performance') {
    return (
      <View>
        <Text style={styles.question}>Tell us about your training</Text>
        <Stepper
          label="Training days per week"
          value={profile.training_days_per_week}
          min={1}
          max={7}
          onChange={v => set('training_days_per_week', v)}
        />
        <Text style={styles.subQuestion}>Training style</Text>
        {[
          { value: 'lifting', label: '🏋️  Lifting / strength training' },
          { value: 'hybrid', label: '⚔️  Hybrid (lifting + cardio)' },
          { value: 'endurance', label: '🏃  Endurance / cardio focused' },
        ].map(o => (
          <ChoiceCard
            key={o.value}
            label={o.label}
            selected={profile.training_style === o.value}
            onPress={() => set('training_style', o.value)}
          />
        ))}
        <Text style={styles.subQuestion}>Experience level</Text>
        {[
          { value: 'beginner', label: 'Beginner  (under 1 year)' },
          { value: 'intermediate', label: 'Intermediate  (1–3 years)' },
          { value: 'advanced', label: 'Advanced  (3+ years)' },
        ].map(o => (
          <ChoiceCard
            key={o.value}
            label={o.label}
            selected={profile.experience_level === o.value}
            onPress={() => set('experience_level', o.value)}
          />
        ))}
      </View>
    );
  }

  if (profile.goal_profile === 'health_energy') {
    return (
      <View>
        <Text style={styles.question}>A bit about your daily life</Text>
        <RatingRow
          label="Sleep quality  (1 = poor, 5 = great)"
          value={profile.sleep_quality_1_5}
          onChange={v => set('sleep_quality_1_5', v)}
        />
        <RatingRow
          label="Stress level  (1 = low, 5 = high)"
          value={profile.stress_level_1_5}
          onChange={v => set('stress_level_1_5', v)}
        />
        <Text style={styles.subQuestion}>Daily caffeine use</Text>
        {[
          { value: 'none', label: 'None' },
          { value: 'low', label: 'Low  (1 cup or less)' },
          { value: 'moderate', label: 'Moderate  (2–3 cups)' },
          { value: 'high', label: 'High  (4+ cups / pre-workout)' },
        ].map(o => (
          <ChoiceCard
            key={o.value}
            label={o.label}
            selected={profile.caffeine_use === o.value}
            onPress={() => set('caffeine_use', o.value)}
          />
        ))}
      </View>
    );
  }

  if (profile.goal_profile === 'longevity') {
    return (
      <View>
        <Text style={styles.question}>A few quick details</Text>
        <Text style={styles.subQuestion}>Age range</Text>
        {[
          { value: '18-29', label: '18–29' },
          { value: '30-39', label: '30–39' },
          { value: '40-49', label: '40–49' },
          { value: '50+', label: '50+' },
        ].map(o => (
          <ChoiceCard
            key={o.value}
            label={o.label}
            selected={profile.age_range === o.value}
            onPress={() => set('age_range', o.value)}
          />
        ))}
        <Toggle
          label="Open to bloodwork / lab testing?"
          value={profile.open_to_bloodwork}
          onChange={v => set('open_to_bloodwork', v)}
        />
        <Text style={styles.subQuestion}>Family health history (optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. heart disease, diabetes, osteoporosis..."
          placeholderTextColor="#6b7280"
          multiline
          numberOfLines={3}
          value={profile.family_history_notes}
          onChangeText={v => set('family_history_notes', v)}
        />
      </View>
    );
  }

  return null;
}

function StepDietType({ profile, set }) {
  const options = [
    { value: 'omnivore', label: '🍗  Omnivore (eat everything)' },
    { value: 'high_protein_carb', label: '💪  High protein / high carb' },
    { value: 'low_carb_keto', label: '🥩  Low carb / keto' },
    { value: 'vegan', label: '🌱  Vegan' },
    { value: 'vegetarian', label: '🥗  Vegetarian' },
    { value: 'other', label: '🍽️  Other / mixed' },
  ];

  return (
    <View>
      <Text style={styles.question}>What best describes your diet?</Text>
      {options.map(o => (
        <ChoiceCard
          key={o.value}
          label={o.label}
          selected={profile.diet_type === o.value}
          onPress={() => set('diet_type', o.value)}
        />
      ))}
    </View>
  );
}

function StepDietDesc({ profile, set }) {
  return (
    <View>
      <Text style={styles.question}>Describe what you normally eat in a day</Text>
      <Text style={styles.subtext}>
        Include any allergies, intolerances, or restrictions. This is optional but helps personalize your recommendations.
      </Text>
      <TextInput
        style={[styles.textArea, { minHeight: 130 }]}
        placeholder="e.g. Eggs and oatmeal for breakfast, chicken and rice for lunch, steak and veggies for dinner. Lactose intolerant."
        placeholderTextColor="#6b7280"
        multiline
        value={profile.diet_description}
        onChangeText={v => set('diet_description', v)}
      />
    </View>
  );
}

function StepConstraints({ profile, set, toggleAvoid }) {
  const AVOID_TAGS = [
    'stimulants',
    'artificial sweeteners',
    'animal products',
    'gluten',
    'soy',
    'dairy',
  ];

  return (
    <View>
      <Text style={styles.question}>Last step — preferences & limits</Text>

      <Text style={styles.subQuestion}>Monthly supplement budget</Text>
      {[
        { value: 'low', label: '💰  Low  (under $30 / mo)' },
        { value: 'medium', label: '💰💰  Medium  ($30–$80 / mo)' },
        { value: 'high', label: '💰💰💰  High  ($80+ / mo)' },
      ].map(o => (
        <ChoiceCard
          key={o.value}
          label={o.label}
          selected={profile.budget_level === o.value}
          onPress={() => set('budget_level', o.value)}
        />
      ))}

      <Stepper
        label="Max daily pills / capsules I'm comfortable with"
        value={profile.max_daily_pills}
        min={1}
        max={20}
        onChange={v => set('max_daily_pills', v)}
      />

      <Text style={styles.subQuestion}>Anything to avoid? (optional)</Text>
      <View style={styles.tagRow}>
        {AVOID_TAGS.map(tag => {
          const selected = profile.avoid_categories.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, selected && styles.tagSelected]}
              onPress={() => toggleAvoid(tag)}
            >
              <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{tag}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Shared UI primitives ──────────────────────────────────────────────────

function ChoiceCard({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.choiceCard, selected && styles.choiceCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.choiceRow}>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <View style={styles.radioDot} />}
        </View>
        <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Stepper({ label, value, min, max, onChange }) {
  return (
    <View style={styles.stepperWrap}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onChange(Math.max(min, value - 1))}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onChange(Math.min(max, value + 1))}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RatingRow({ label, value, onChange }) {
  return (
    <View style={styles.ratingWrap}>
      <Text style={styles.ratingLabel}>{label}</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.ratingDot, value === n && styles.ratingDotSelected]}
            onPress={() => onChange(n)}
          >
            <Text style={[styles.ratingNum, value === n && styles.ratingNumSelected]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)} activeOpacity={0.8}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0C10' },
  container: { flex: 1 },
  screenTitle: { color: '#fff', fontSize: 22, fontWeight: '800', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 0 },
  progressRow: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 6 },
  progressTrack: { height: 3, backgroundColor: '#1e2027' },
  progressFill: { height: 3, backgroundColor: '#5eead4' },
  inner: { padding: 24, paddingBottom: 60 },
  stepLabel: { color: '#6b7280', fontSize: 13, marginBottom: 8 },
  question: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 20, lineHeight: 30 },
  subQuestion: { color: '#9ca3af', fontSize: 14, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  subtext: { color: '#6b7280', fontSize: 14, marginBottom: 16, lineHeight: 20 },
  error: { color: '#fca5a5', backgroundColor: '#7f1d1d', padding: 12, borderRadius: 8, marginTop: 16, fontSize: 14 },
  hint: { backgroundColor: '#0D0F13', borderRadius: 10, borderWidth: 1, borderColor: '#1e2027', padding: 14, marginTop: 12 },
  hintText: { color: '#6b7280', fontSize: 13, lineHeight: 18 },

  // Nav
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 32, gap: 12 },
  backBtn: { flex: 1, padding: 15, alignItems: 'center' },
  backText: { color: '#6b7280', fontSize: 15 },
  nextBtn: { flex: 2, backgroundColor: '#5eead4', borderRadius: 10, padding: 15, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.35 },
  nextText: { color: '#0B0C10', fontWeight: '700', fontSize: 16 },

  // Choice card
  choiceCard: {
    backgroundColor: '#0D0F13',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e2027',
    padding: 16,
    marginBottom: 10,
  },
  choiceCardSelected: { borderColor: '#5eead4', backgroundColor: '#071515' },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#5eead4' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#5eead4' },
  choiceText: { color: '#d1d5db', fontSize: 15, flex: 1 },
  choiceTextSelected: { color: '#5eead4' },

  // Stepper
  stepperWrap: {
    backgroundColor: '#0D0F13',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e2027',
    padding: 16,
    marginBottom: 16,
  },
  stepperLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 12 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e2027',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { color: '#fff', fontSize: 22, lineHeight: 24 },
  stepperValue: { color: '#fff', fontSize: 24, fontWeight: '700', minWidth: 40, textAlign: 'center' },

  // Rating
  ratingWrap: {
    backgroundColor: '#0D0F13',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e2027',
    padding: 16,
    marginBottom: 14,
  },
  ratingLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 12 },
  ratingRow: { flexDirection: 'row', gap: 10 },
  ratingDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1e2027',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingDotSelected: { backgroundColor: '#5eead4' },
  ratingNum: { color: '#9ca3af', fontSize: 16, fontWeight: '600' },
  ratingNumSelected: { color: '#0B0C10' },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D0F13',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e2027',
    padding: 16,
    marginBottom: 14,
  },
  toggleLabel: { color: '#d1d5db', fontSize: 15, flex: 1, paddingRight: 12 },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackOn: { backgroundColor: '#5eead4' },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // Text area
  textArea: {
    backgroundColor: '#0D0F13',
    color: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e2027',
    padding: 14,
    fontSize: 15,
    textAlignVertical: 'top',
    minHeight: 100,
  },

  // Avoid tags
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  tag: {
    backgroundColor: '#0D0F13',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e2027',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagSelected: { backgroundColor: '#071515', borderColor: '#5eead4' },
  tagText: { color: '#9ca3af', fontSize: 14 },
  tagTextSelected: { color: '#5eead4' },
});
