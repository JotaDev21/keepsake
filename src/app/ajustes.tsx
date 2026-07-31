import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, Card, Chip, Icon, ScreenHeader, Text } from '@/components';
import { waterRepo } from '@/db/repositories';
import { radius, spacing, useMode, useTheme } from '@/design';
import { authenticate, canUseBiometrics } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { syncReminders } from '@/lib/notifications';
import { startOfDay } from '@/lib/mood';
import { prefs } from '@/lib/prefs';
import { usePersonStore } from '@/stores/usePersonStore';
import { useCareStore } from '@/stores/useCareStore';
import { useSyncStore, type SharingPreferenceKey } from '@/stores/useSyncStore';

const CHECKIN_HOURS = [19, 20, 21, 22];
const WATER_GOALS = [
  { ml: 1500, label: '1,5 L' },
  { ml: 2000, label: '2 L' },
  { ml: 2500, label: '2,5 L' },
  { ml: 3000, label: '3 L' },
];

export default function Ajustes() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, toggleMode } = useMode();
  const person = usePersonStore((s) => s.person);
  const partnerJoined = useSyncStore((s) => s.partnerJoined);
  const sharing = useSyncStore((s) => s.sharingPreferences);
  const setSharingPreference = useSyncStore((s) => s.setSharingPreference);
  const pushWater = useSyncStore((s) => s.pushWater);
  const [appLock, setAppLock] = useState(prefs.isAppLockEnabled());
  const [screenCaptureAllowed, setScreenCaptureAllowed] = useState(
    prefs.isScreenCaptureAllowed(),
  );
  const [checkin, setCheckin] = useState(prefs.isCheckinEnabled());
  const [checkinHour, setCheckinHour] = useState(prefs.getCheckinHour());
  const [waterGoal, setWaterGoal] = useState(prefs.getWaterGoalMl());
  const [waterReminders, setWaterReminders] = useState(prefs.isWaterRemindersEnabled());
  const careSharing = useCareStore((state) => state.sharing);
  const setCareSharing = useCareStore((state) => state.setSharing);
  const [sharingBusy, setSharingBusy] = useState<SharingPreferenceKey | null>(null);

  const onToggleMode = () => {
    haptics.tap();
    toggleMode();
  };

  const reschedule = () => {
    if (person) syncReminders(person.id).catch(() => {});
  };

  const toggleCheckin = (value: boolean) => {
    haptics.tap();
    prefs.setCheckinEnabled(value);
    setCheckin(value);
    reschedule();
  };

  const pickHour = (h: number) => {
    prefs.setCheckinHour(h);
    setCheckinHour(h);
    reschedule();
  };

  const pickWaterGoal = async (ml: number) => {
    prefs.setWaterGoalMl(ml);
    setWaterGoal(ml);
    haptics.tap();
    if (person && sharing.water) {
      const todayMl = await waterRepo.get(person.id, startOfDay());
      await pushWater(startOfDay(), todayMl, ml);
    }
  };

  const toggleWaterReminders = (value: boolean) => {
    haptics.tap();
    prefs.setWaterRemindersEnabled(value);
    setWaterReminders(value);
    reschedule();
  };

  const toggleAppLock = async (value: boolean) => {
    haptics.tap();
    if (value) {
      const ok = await canUseBiometrics();
      if (!ok) {
        Alert.alert(
          'Biometria indisponível',
          'Cadastre uma digital ou o rosto nas configurações do aparelho para usar o bloqueio.',
        );
        return;
      }
      const authed = await authenticate();
      if (!authed) return;
      prefs.setAppLockEnabled(true);
      setAppLock(true);
    } else {
      prefs.setAppLockEnabled(false);
      setAppLock(false);
    }
  };

  const saveScreenCapturePreference = async (allowed: boolean) => {
    prefs.setScreenCaptureAllowed(allowed);
    setScreenCaptureAllowed(allowed);
    haptics.tap();
    try {
      if (allowed) await ScreenCapture.allowScreenCaptureAsync();
      else await ScreenCapture.preventScreenCaptureAsync();
    } catch {
      Alert.alert(
        'Não consegui mudar agora',
        'Feche e abra o app para a proteção de tela ser aplicada novamente.',
      );
    }
  };

  const toggleScreenCapture = (allowed: boolean) => {
    if (!allowed) {
      void saveScreenCapturePreference(false);
      return;
    }
    Alert.alert(
      'Permitir capturas?',
      'Prints e gravações podem guardar fotos, cartas e notas fora da proteção do memory ev.',
      [
        { text: 'Manter bloqueado', style: 'cancel' },
        {
          text: 'Permitir',
          onPress: () => void saveScreenCapturePreference(true),
        },
      ],
    );
  };

  const toggleSharing = async (key: SharingPreferenceKey, value: boolean) => {
    if (sharingBusy || !partnerJoined) return;
    haptics.tap();
    setSharingBusy(key);
    const ok = await setSharingPreference(key, value);
    setSharingBusy(null);
    if (!ok) {
      Alert.alert('Ainda não conectados', 'Conecte os dois celulares para escolher o que atravessa.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.huge,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
      >
        <ScreenHeader title="Ajustes" mark={false} style={styles.header} />

        <Text variant="overline" color="textMuted" style={styles.sectionLabel}>
          Aparência
        </Text>
        <Card style={styles.section}>
          <View style={styles.row}>
            <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
              <Icon name={mode === 'dia' ? 'sun' : 'moon'} size={18} color="accent" />
            </View>
            <View style={styles.rowBody}>
              <Text variant="callout" color="text">
                {mode === 'dia' ? 'Luz do dia' : 'Campo à noite'}
              </Text>
              <Text variant="subhead" color="textMuted" style={styles.rowHint}>
                O girassol sob o sol ou sob as estrelas.
              </Text>
            </View>
            <Switch
              value={mode === 'dia'}
              onValueChange={onToggleMode}
              trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
              thumbColor={theme.colors.text}
            />
          </View>
        </Card>

        <Text variant="overline" color="textMuted" style={styles.sectionLabel}>
          Vínculo
        </Text>
        <Card onPress={() => router.push('/conexao')} accessibilityLabel="Conexão" style={styles.section}>
          <View style={styles.row}>
            <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
              <Icon name="heart" size={18} color="accent" />
            </View>
            <View style={styles.rowBody}>
              <Text variant="callout" color="text">
                Conexão
              </Text>
              <Text variant="subhead" color="textMuted" style={styles.rowHint}>
                Parear os dois apps e ver o humor um do outro.
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color="textMuted" />
          </View>
        </Card>

        <Text variant="overline" color="textMuted" style={styles.sectionLabel}>
          O que atravessa
        </Text>
        <Card style={styles.section}>
          <Text variant="callout" color="text">
              Você escolhe o que chega ao outro aparelho
          </Text>
          <Text variant="subhead" color="textMuted" style={styles.sharingIntro}>
            Tudo começa privado. Pulsos e memórias só são enviados quando você toca.
          </Text>
          {([
            {
              key: 'mood',
              icon: 'heart',
              title: 'Humor',
              hint: 'Só estado e intensidade. Sua nota e sentimentos ficam neste celular.',
            },
            {
              key: 'water',
              icon: 'droplet',
              title: 'Água',
              hint: 'Mostra quanto você bebeu hoje no copo de vocês.',
            },
            {
              key: 'song',
              icon: 'music',
              title: 'Música do dia',
              hint: 'Compartilha apenas a música que você escolher para o dia.',
            },
            {
              key: 'dates',
              icon: 'calendar',
              title: 'Datas importantes',
        hint: 'Leva suas datas para a tela Hoje da outra pessoa.',
            },
          ] as const).map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.row,
                styles.sharingRow,
                index > 0 && {
                  borderTopColor: theme.colors.border,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
                !partnerJoined && styles.disabled,
              ]}
            >
              <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
                <Icon name={item.icon} size={18} color="accent" />
              </View>
              <View style={styles.rowBody}>
                <Text variant="callout" color="text">
                  {item.title}
                </Text>
                <Text variant="subhead" color="textMuted" style={styles.rowHint}>
                  {item.hint}
                </Text>
              </View>
              <Switch
                value={sharing[item.key]}
                disabled={!partnerJoined || sharingBusy != null}
                onValueChange={(value) => void toggleSharing(item.key, value)}
                trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
                thumbColor={theme.colors.text}
              />
            </View>
          ))}
          <View
            style={[
              styles.row,
              styles.sharingRow,
              { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth },
              !partnerJoined && styles.disabled,
            ]}
          >
            <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
              <Icon name="feather" size={18} color="accent" />
            </View>
            <View style={styles.rowBody}>
              <Text variant="callout" color="text">Cuidado de hoje</Text>
              <Text variant="subhead" color="textMuted" style={styles.rowHint}>
                Compartilha apenas os gestos marcados hoje, sem notas ou histórico.
              </Text>
            </View>
            <Switch
              value={careSharing}
              disabled={!partnerJoined}
              onValueChange={(value) => void setCareSharing(value)}
              trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
              thumbColor={theme.colors.text}
            />
          </View>
          {!partnerJoined ? (
            <Text variant="caption" color="textFaint" style={styles.connectionHint}>
              Essas escolhas aparecem quando os dois celulares estiverem conectados.
            </Text>
          ) : null}
        </Card>

        <Text variant="overline" color="textMuted" style={styles.sectionLabel}>
          Integrações
        </Text>
        <Card onPress={() => router.push('/musica')} accessibilityLabel="Música" style={styles.section}>
          <View style={styles.row}>
            <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
              <Icon name="music" size={18} color="accent" />
            </View>
            <View style={styles.rowBody}>
              <Text variant="callout" color="text">
                Música (Spotify)
              </Text>
              <Text variant="subhead" color="textMuted" style={styles.rowHint}>
                Música do dia e o que está tocando.
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color="textMuted" />
          </View>
        </Card>

        <Text variant="overline" color="textMuted" style={styles.sectionLabel}>
          Notificações
        </Text>
        <Card style={styles.section}>
          <View style={styles.row}>
            <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
              <Icon name="bell" size={18} color="accent" />
            </View>
            <View style={styles.rowBody}>
              <Text variant="callout" color="text">
                Lembrete do dia
              </Text>
              <Text variant="subhead" color="textMuted" style={styles.rowHint}>
                Um toque à noite pra registrar como vocês estão.
              </Text>
            </View>
            <Switch
              value={checkin}
              onValueChange={toggleCheckin}
              trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
              thumbColor={theme.colors.text}
            />
          </View>
          {checkin ? (
            <View style={[styles.hours, { borderTopColor: theme.colors.border }]}>
              {CHECKIN_HOURS.map((h) => (
                <Chip key={h} label={`${h}h`} selected={checkinHour === h} onPress={() => pickHour(h)} />
              ))}
            </View>
          ) : null}
        </Card>

        <Text variant="overline" color="textMuted" style={styles.sectionLabel}>
          Água
        </Text>
        <Card style={styles.section}>
          <View style={styles.row}>
            <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
              <Icon name="droplet" size={18} color="accent" />
            </View>
            <View style={styles.rowBody}>
              <Text variant="callout" color="text">
                Meta do dia
              </Text>
              <Text variant="subhead" color="textMuted" style={styles.rowHint}>
                O copo de vocês dois na tela Hoje.
              </Text>
            </View>
          </View>
          <View style={[styles.hours, { borderTopColor: theme.colors.border }]}>
            {WATER_GOALS.map((g) => (
              <Chip key={g.ml} label={g.label} selected={waterGoal === g.ml} onPress={() => void pickWaterGoal(g.ml)} />
            ))}
            {!WATER_GOALS.some((goal) => goal.ml === waterGoal) ? (
              <Chip
                label={`${(waterGoal / 1000).toFixed(2).replace('.', ',').replace(/0$/, '')} L`}
                selected
                onPress={() => router.push('/jardim')}
              />
            ) : null}
            <Chip label="Personalizar" icon="edit-3" onPress={() => router.push('/jardim')} />
          </View>
          <View style={[styles.row, styles.subRow, { borderTopColor: theme.colors.border }]}>
            <View style={styles.rowBody}>
              <Text variant="callout" color="text">
                Lembretes de água
              </Text>
              <Text variant="subhead" color="textMuted" style={styles.rowHint}>
                Quatro toques leves ao longo do dia.
              </Text>
            </View>
            <Switch
              value={waterReminders}
              onValueChange={toggleWaterReminders}
              trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
              thumbColor={theme.colors.text}
            />
          </View>
        </Card>

        <Text variant="overline" color="textMuted" style={styles.sectionLabel}>
          Privacidade
        </Text>
        <Card>
          <View style={styles.row}>
            <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
              <Icon name="lock" size={18} color="accent" />
            </View>
            <View style={styles.rowBody}>
              <Text variant="callout" color="text">
                Bloqueio por biometria
              </Text>
              <Text variant="subhead" color="textMuted" style={styles.rowHint}>
                Pede sua digital ou rosto ao abrir o app.
              </Text>
            </View>
            <Switch
              value={appLock}
              onValueChange={toggleAppLock}
              trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
              thumbColor={theme.colors.text}
            />
          </View>
          <View
            style={[
              styles.row,
              styles.subRow,
              { borderTopColor: theme.colors.border },
            ]}
          >
            <View style={[styles.glyph, { backgroundColor: theme.colors.accentSoft }]}>
              <Icon name={screenCaptureAllowed ? 'camera' : 'camera-off'} size={18} color="accent" />
            </View>
            <View style={styles.rowBody}>
              <Text variant="callout" color="text">
                Permitir prints e gravação
              </Text>
              <Text variant="subhead" color="textMuted" style={styles.rowHint}>
                {screenCaptureAllowed
                  ? 'Este aparelho pode capturar as telas do app.'
                  : 'Bloqueados neste aparelho para proteger o conteúdo.'}
              </Text>
            </View>
            <Switch
              value={screenCaptureAllowed}
              onValueChange={toggleScreenCapture}
              trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
              thumbColor={theme.colors.text}
            />
          </View>
        </Card>

        <Text variant="caption" color="textFaint" align="center" style={styles.footer}>
          memory ev · guardado no aparelho. Com o vínculo, o essencial viaja só entre os dois apps.
        </Text>
      </ScrollView>

      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { marginBottom: spacing.xxl },
  sectionLabel: { marginBottom: spacing.md },
  section: { marginBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowBody: { flex: 1 },
  rowHint: { marginTop: spacing.xs },
  glyph: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { marginTop: spacing.xl },
  subRow: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
  hours: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sharingIntro: { marginTop: spacing.xs, marginBottom: spacing.sm },
  sharingRow: { paddingVertical: spacing.lg },
  connectionHint: { marginTop: spacing.sm },
  disabled: { opacity: 0.5 },
});
