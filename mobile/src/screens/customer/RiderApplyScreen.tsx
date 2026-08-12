import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { colors, fontSizes, radii, spacing } from '../../theme';
import { useAuth } from '../../lib/auth';
import {
  fetchRiderOnboardingFields,
  applyAsDeliveryPartner,
  type OnboardingField,
  type DeliveryApplication,
} from '../../lib/api';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { Bike, ChevronLeft, ChevronRight, Check, User, X } from 'lucide-react-native';

const MODES = [
  { id: 'WALK', label: 'Walking' },
  { id: 'BICYCLE', label: 'Bicycle' },
  { id: 'MOTORCYCLE', label: 'Motorcycle' },
  { id: 'CAR', label: 'Car' },
];

const STEPS = [
  { id: 'about', label: 'About you' },
  { id: 'mode', label: 'How you deliver' },
  { id: 'area', label: 'Where' },
  { id: 'kyc', label: 'Verification' },
  { id: 'review', label: 'Review' },
];

export function RiderApplyScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState('MOTORCYCLE');
  const [vehicle, setVehicle] = useState('');
  const [area, setArea] = useState('');
  const [radius, setRadius] = useState(5000);
  const [fields, setFields] = useState<OnboardingField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchRiderOnboardingFields()
      .then((res) => setFields(res.fields))
      .catch(() => setError('Could not load onboarding form'))
      .finally(() => setFieldsLoading(false));
  }, []);

  const visibleFields = useMemo(
    () =>
      fields.filter((f) => {
        if (!f.gatingRule) return true;
        const [gateKey, gateValue] = f.gatingRule.split('=');
        return onboardingData[gateKey]?.toString() === gateValue;
      }),
    [fields, onboardingData]
  );

  function updateOnboarding(key: string, value: any) {
    setOnboardingData((prev) => ({ ...prev, [key]: value }));
  }

  function canNext() {
    if (step === 1 && !mode) return false;
    if (step === 2 && !area.trim()) return false;
    if (step === 3) {
      for (const f of visibleFields) {
        if (f.required && (!onboardingData[f.key] || (Array.isArray(onboardingData[f.key]) && !onboardingData[f.key].length)))
          return false;
      }
    }
    return true;
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await applyAsDeliveryPartner({
        deliveryMode: mode,
        vehicle,
        operatingArea: area,
        serviceRadiusMeters: radius,
        kycSubmitted: !!(onboardingData.idDocumentUrl || onboardingData.facePhotoUrl),
        onboardingData,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Application failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.success}>
          <View style={styles.successIcon}>
            <Check size={40} color={colors.brand900} />
          </View>
          <Text style={styles.title}>Application submitted</Text>
          <Text style={styles.body}>We'll review your details and get back to you soon.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.close}>
          <X size={24} color={colors.white} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Become a delivery partner</Text>
          <Text style={styles.subtitle}>Earn money delivering food around you</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.stepper}>
        {STEPS.map((s, i) => (
          <View key={s.id} style={styles.stepDotWrap}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, i <= step && styles.stepDotTextActive]}>
                {i < step ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={styles.stepLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {fieldsLoading && step === 3 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand100} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {error && <Text style={styles.error}>{error}</Text>}

          {step === 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <User size={20} color={colors.brand100} />
                <Text style={styles.cardTitle}>About you</Text>
              </View>
              <Text style={styles.body}>We'll use your profile name and phone to contact you.</Text>
              <View style={styles.row}>
                <Text style={styles.muted}>Name:</Text>
                <Text style={styles.body}>{user?.firstName || ''} {user?.lastName || ''}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.muted}>Phone:</Text>
                <Text style={styles.body}>{user?.phone || 'Not set'}</Text>
              </View>
            </View>
          )}

          {step === 1 && (
            <View>
              <Text style={styles.body}>How do you plan to deliver?</Text>
              <View style={styles.modeGrid}>
                {MODES.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.modeCard, mode === m.id && styles.modeCardActive]}
                    onPress={() => setMode(m.id)}
                  >
                    <Bike size={24} color={mode === m.id ? colors.brand100 : colors.muted} />
                    <Text style={[styles.modeText, mode === m.id && styles.modeTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Vehicle description (optional)</Text>
              <TextInput
                style={styles.input}
                value={vehicle}
                onChangeText={setVehicle}
                placeholder="e.g. Red Honda motorcycle"
                placeholderTextColor={colors.muted}
              />
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.body}>Where do you want to deliver?</Text>
              <Text style={styles.label}>Your area or neighborhood</Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={setArea}
                placeholder="e.g. Ikeja GRA, Lagos"
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.label}>Delivery radius (meters)</Text>
              <TextInput
                style={styles.input}
                value={String(radius)}
                onChangeText={(v) => setRadius(Math.max(500, Math.min(20000, Number(v) || 500)))}
                keyboardType="numeric"
                placeholderTextColor={colors.muted}
              />
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.body}>Verification & references</Text>
              {visibleFields.map((f) => (
                <OnboardingInput key={f.id} field={f} value={onboardingData[f.key] ?? ''} onChange={(v) => updateOnboarding(f.key, v)} />
              ))}
              {fields.length === 0 && <Text style={styles.muted}>No verification fields are currently configured.</Text>}
            </View>
          )}

          {step === 4 && (
            <View style={styles.card}>
              <Text style={styles.body}>Review your application</Text>
              <ReviewRow label="Name" value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—'} />
              <ReviewRow label="Phone" value={user?.phone || '—'} />
              <ReviewRow label="Delivery mode" value={MODES.find((m) => m.id === mode)?.label || mode} />
              <ReviewRow label="Vehicle" value={vehicle || '—'} />
              <ReviewRow label="Area" value={area} />
              <ReviewRow label="Radius" value={`${radius} m`} />
              {visibleFields.map((f) =>
                onboardingData[f.key] ? (
                  <ReviewRow key={f.key} label={f.label} value={String(onboardingData[f.key])} />
                ) : null
              )}
            </View>
          )}

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
          style={styles.ghostButton}
        >
          <ChevronLeft size={18} color={colors.white} />
          <Text style={styles.ghostButtonText}>Back</Text>
        </TouchableOpacity>

        {step < STEPS.length - 1 ? (
          <TouchableOpacity onPress={() => setStep((s) => s + 1)} disabled={!canNext()} style={[styles.primaryButton, !canNext() && { opacity: 0.5 }]}>
            <Text style={styles.primaryButtonText}>Next</Text>
            <ChevronRight size={18} color={colors.brand900} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={submit} disabled={submitting} style={styles.primaryButton}>
            {submitting ? (
              <ActivityIndicator color={colors.brand900} />
            ) : (
              <>
                <Check size={18} color={colors.brand900} />
                <Text style={styles.primaryButtonText}>Submit application</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function OnboardingInput({
  field,
  value,
  onChange,
}: {
  field: OnboardingField;
  value: any;
  onChange: (v: any) => void;
}) {
  if (field.type === 'textarea') {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{field.label} {field.required && <Text style={styles.required}>*</Text>}</Text>
        <TextInput
          style={[styles.input, { minHeight: 80 }]} value={value} onChangeText={onChange} multiline
          placeholderTextColor={colors.muted} />
      </View>
    );
  }

  if (field.type === 'select') {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{field.label} {field.required && <Text style={styles.required}>*</Text>}</Text>
        {field.options.map((o) => (
          <TouchableOpacity
            key={o}
            style={[styles.selectOption, value === o && styles.selectOptionActive]}
            onPress={() => onChange(o)}
          >
            <Text style={[styles.selectOptionText, value === o && styles.selectOptionTextActive]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }]}>
        <Switch value={!!value} onValueChange={onChange} trackColor={{ false: colors.muted, true: colors.brand100 }} />
        <Text style={styles.body}>{field.label} {field.required && <Text style={styles.required}>*</Text>}</Text>
      </View>
    );
  }

  if (field.type === 'file') {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{field.label} {field.required && <Text style={styles.required}>*</Text>}</Text>
        <TextInput
          style={styles.input} value={value} onChangeText={onChange} placeholder="https://..."
          placeholderTextColor={colors.muted} autoCapitalize="none"
        />
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{field.label} {field.required && <Text style={styles.required}>*</Text>}</Text>
      <TextInput
        style={styles.input} value={String(value)} onChangeText={(v) => onChange(field.type === 'number' ? Number(v) : v)}
        keyboardType={field.type === 'number' ? 'numeric' : field.type === 'phone' ? 'phone-pad' : 'default'}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.body, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brand900, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.white, fontSize: fontSizes.xl, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: fontSizes.sm, marginTop: spacing.xs },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  stepDotWrap: { flex: 1, alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: colors.brand100 },
  stepDotText: { color: colors.muted, fontSize: fontSizes.xs, fontWeight: '700' },
  stepDotTextActive: { color: colors.brand900 },
  stepLabel: { color: colors.muted, fontSize: fontSizes.xs, marginTop: spacing.xs, textAlign: 'center' },
  scroll: { paddingBottom: spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  cardTitle: { color: colors.brand100, fontWeight: '700' },
  body: { color: colors.white, fontSize: fontSizes.base, marginBottom: spacing.sm },
  muted: { color: colors.muted, fontSize: fontSizes.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  label: { color: colors.muted, fontSize: fontSizes.sm, marginBottom: spacing.xs },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', color: colors.white, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  required: { color: colors.danger },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  modeCard: { width: '47%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modeCardActive: { borderColor: colors.brand100, backgroundColor: 'rgba(132,204,22,0.1)' },
  modeText: { color: colors.muted, fontWeight: '600', marginTop: spacing.sm },
  modeTextActive: { color: colors.brand100 },
  field: { marginBottom: spacing.md },
  selectOption: { backgroundColor: 'rgba(255,255,255,0.05)', padding: spacing.md, borderRadius: radii.lg, marginBottom: spacing.xs, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  selectOptionActive: { backgroundColor: 'rgba(132,204,22,0.1)', borderColor: colors.brand100 },
  selectOptionText: { color: colors.white },
  selectOptionTextActive: { color: colors.brand100, fontWeight: '700' },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  ghostButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm },
  ghostButtonText: { color: colors.white, fontWeight: '700' },
  primaryButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.brand100, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.full },
  primaryButtonText: { color: colors.brand900, fontWeight: '700' },
  error: { color: colors.danger, marginBottom: spacing.md },
  success: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.brand100, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
});
