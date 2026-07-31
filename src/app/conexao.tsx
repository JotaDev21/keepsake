import { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  Button,
  Card,
  Icon,
  MemberAvatar,
  ScreenHeader,
  Text,
  TextField,
} from '@/components';
import { radius, spacing, useTheme } from '@/design';
import { dayAgeLabel, presenceLabel } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import { moodColor, moodScale, startOfDay } from '@/lib/mood';
import { usePersonStore } from '@/stores/usePersonStore';
import { useSyncStore } from '@/stores/useSyncStore';

const moodLabel = (key: string) => moodScale.find((m) => m.key === key)?.label ?? key;

/** The couple's code — the hero artifact of this screen, on a warm golden plate. */
function CodePlate({ code }: { code: string | null }) {
  const theme = useTheme();
  const readableCode = code?.match(/.{1,4}/g)?.join(' ') ?? '';
  return (
    <View
      style={[
        styles.codePlate,
        { backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.border },
      ]}
    >
      <Text variant="title1" color="accent" align="center" style={styles.code}>
        {readableCode}
      </Text>
    </View>
  );
}

export default function Conexao() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const person = usePersonStore((s) => s.person);
  const status = useSyncStore((s) => s.status);
  const paired = useSyncStore((s) => s.paired);
  const partnerJoined = useSyncStore((s) => s.partnerJoined);
  const inviteCode = useSyncStore((s) => s.inviteCode);
  const partnerMood = useSyncStore((s) => s.partnerMood);
  const myProfile = useSyncStore((s) => s.myProfile);
  const partnerProfile = useSyncStore((s) => s.partnerProfile);
  const createInvite = useSyncStore((s) => s.createInvite);
  const joinWithCode = useSyncStore((s) => s.joinWithCode);
  const unpair = useSyncStore((s) => s.unpair);
  const evictPartner = useSyncStore((s) => s.evictPartner);
  const init = useSyncStore((s) => s.init);
  const sendNudge = useSyncStore((s) => s.sendNudge);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingCheckin, setRequestingCheckin] = useState(false);

  const nome = person?.nome ?? 'a outra pessoa';

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    haptics.tap();
    const c = await createInvite();
    setBusy(false);
    if (!c) setError('Não consegui criar o convite. Tente de novo.');
    else haptics.success();
  };

  const onJoin = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    haptics.tap();
    const result = await joinWithCode(code);
    setBusy(false);
    if (result === 'ok') haptics.success();
    else if (result === 'cheio')
      setError(`O vínculo já tem dois aparelhos. No aparelho que continua conectado, toque em "Liberar a vaga" e tente de novo.`);
    else if (result === 'expirado') setError('Esse convite expirou ou já foi usado. Gere um novo no outro aparelho.');
    else setError('Código inválido.');
  };

  const onShare = () => {
    if (!inviteCode) return;
    haptics.tap();
    Share.share({ message: `memory ev — nosso código: ${inviteCode}` }).catch(() => {});
  };

  const onUnpair = () => {
    haptics.tap();
    Alert.alert(
      'Desfazer o vínculo?',
      'Este aparelho sai do casal. O conteúdo local continua aqui, mas será necessário um novo convite para reconectar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desfazer',
          style: 'destructive',
          onPress: async () => {
            const ok = await unpair();
            if (ok) haptics.success();
            else setError('Não consegui desfazer agora. Tente de novo.');
          },
        },
      ],
    );
  };

  const onEvict = () => {
    haptics.tap();
    Alert.alert(
      'Liberar a vaga?',
      `Use isto quando a outra pessoa trocou ou reinstalou o aparelho. O antigo sai e um convite novo, válido por até 24 horas, será criado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Liberar',
          style: 'destructive',
          onPress: async () => {
            const newCode = await evictPartner();
            if (newCode) haptics.success();
            else setError('Não consegui liberar agora. Tente de novo.');
          },
        },
      ],
    );
  };

  const onRequestCheckin = async () => {
    if (requestingCheckin) return;
    setRequestingCheckin(true);
    haptics.tap();
    const ok = await sendNudge('checkin');
    setRequestingCheckin(false);
    if (ok) {
      haptics.success();
      Alert.alert('Pedido enviado', `Um toque gentil chegou para ${partnerProfile?.displayName ?? nome}.`);
    } else {
      setError('Não consegui pedir o check-in agora. Tente de novo.');
    }
  };

  const moodIsToday = partnerMood != null && partnerMood.dia === startOfDay();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + spacing.huge,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxxl,
        }}
      >
        <ScreenHeader
          overline="Vínculo"
          title="Conexão"
          subtitle={`Um app pra dois. Conecte este aparelho ao de ${nome} para o que vocês escolherem atravessar.`}
          style={styles.header}
        />

        <Card style={styles.perspectiveCard}>
          <View style={styles.row}>
            <Icon name="repeat" size={18} color="accent" />
            <Text variant="callout" color="text">
              Dois pontos de vista
            </Text>
          </View>
          <Text variant="subhead" color="textMuted" style={styles.codeHint}>
            Neste aparelho, {myProfile?.displayName ?? 'você'} guarda {nome}. No outro, a outra
            pessoa configura o espaço dela para guardar você. O app é o mesmo; cada lado escolhe o
            que permanece privado e o que atravessa.
          </Text>
        </Card>

        {status === 'unconfigured' ? (
          <Card>
            <Text variant="body" color="textMuted">
              A sincronização ainda não está configurada neste app.
            </Text>
          </Card>
        ) : status === 'error' ? (
          <Card>
            <Text variant="body" color="textMuted">
              Sem conexão agora. O vínculo continua — só não consigo falar com o servidor.
            </Text>
            <Button label="Tentar de novo" icon="refresh-cw" onPress={() => init()} style={styles.cardAction} />
          </Card>
        ) : paired && partnerJoined ? (
          <>
            <Card featured>
              <View style={styles.row}>
                <Icon name="check-circle" size={20} color="accent" />
                <Text variant="callout" color="text">
                  Conectados
                </Text>
              </View>
              <Text variant="subhead" color="textMuted" style={styles.codeHint}>
                Dois aparelhos conectados. Não existe convite reutilizável enquanto o vínculo estiver completo.
              </Text>
            </Card>

            <Card style={styles.sibling}>
              <Text variant="overline" color="textMuted">
                Vocês por aqui
              </Text>
              <View style={styles.people}>
                <View style={styles.personRow}>
                  <MemberAvatar
                    name={myProfile?.displayName ?? 'Você'}
                    uri={myProfile?.avatarUrl}
                    size={48}
                  />
                  <View style={styles.flex}>
                    <Text variant="caption" color="textMuted">
                      Este aparelho
                    </Text>
                    <Text variant="callout" color="text">
                      {myProfile?.displayName ?? 'Diga quem é você'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.personDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.personRow}>
                  <MemberAvatar
                    name={partnerProfile?.displayName ?? nome}
                    uri={partnerProfile?.avatarUrl}
                    size={48}
                  />
                  <View style={styles.flex}>
                    <Text variant="caption" color="textMuted">
                      Outro aparelho
                    </Text>
                    <Text variant="callout" color="text">
                      {partnerProfile?.displayName ?? `${nome} ainda não escolheu o nome`}
                    </Text>
                    <Text variant="caption" color="textMuted" style={styles.presence}>
                      {presenceLabel(partnerProfile?.lastSeenAt ?? null)}
                    </Text>
                  </View>
                </View>
              </View>
              <Button
                label={myProfile?.displayName ? 'Editar meu nome e foto' : 'Dizer quem sou'}
                icon="user"
                variant="secondary"
                size="sm"
                onPress={() => router.push('/meu-perfil')}
                style={styles.cardAction}
              />
            </Card>

            <Card style={styles.sibling}>
              <Text variant="overline" color="textMuted">
                Humor de {partnerProfile?.displayName ?? nome}
              </Text>
              {partnerMood ? (
                <View style={[styles.row, styles.moodRow]}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: moodColor(partnerMood.humor), opacity: moodIsToday ? 1 : 0.45 },
                    ]}
                  />
                  <View>
                    <Text variant="title2" color="text">
                      {moodLabel(partnerMood.humor)}
                    </Text>
                    <Text variant="caption" color="textMuted" style={styles.moodAge}>
                      {moodIsToday ? 'hoje' : dayAgeLabel(partnerMood.dia)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text variant="body" color="textMuted" style={styles.moodEmpty}>
                  Quando {nome} registrar e escolher compartilhar, aparece aqui — na hora.
                </Text>
              )}
              {!moodIsToday ? (
                <>
                  <Button
                    label="Pedir um check-in"
                    icon="message-circle"
                    variant="secondary"
                    size="sm"
                    loading={requestingCheckin}
                    onPress={onRequestCheckin}
                    style={styles.cardAction}
                  />
                  <Text variant="caption" color="textFaint" style={styles.checkinHint}>
                    Sem adivinhar ou vigiar: a outra pessoa responde quando quiser.
                  </Text>
                </>
              ) : null}
            </Card>

            <Button
              label="Liberar a vaga do outro aparelho"
              variant="ghost"
              onPress={onEvict}
              style={styles.ghostFirst}
            />
            <Button label="Desfazer vínculo" variant="ghost" onPress={onUnpair} style={styles.ghostNext} />
          </>
        ) : paired ? (
          <Card featured>
            <View style={styles.row}>
              <Icon name="clock" size={20} color="accent" />
              <Text variant="callout" color="text">
                Esperando {nome}…
              </Text>
            </View>
            <Text variant="subhead" color="textMuted" style={styles.codeHint}>
              Mande este código para a outra pessoa. Ele funciona uma vez e vale por até 24 horas.
            </Text>
            <CodePlate code={inviteCode} />
            <Button label="Compartilhar código" icon="share" onPress={onShare} style={styles.cardAction} />
            <Button
              label={myProfile?.displayName ? 'Editar meu nome e foto' : 'Dizer quem sou'}
              icon="user"
              variant="secondary"
              onPress={() => router.push('/meu-perfil')}
              style={styles.cardAction}
            />
            <Button label="Desfazer convite" variant="ghost" onPress={onUnpair} style={styles.ghostNext} />
          </Card>
        ) : (
          <>
            <Card>
              <Text variant="heading" color="text">
                Criar um convite
              </Text>
              <Text variant="subhead" color="textMuted" style={styles.cardHint}>
                Gere um convite privado, válido por até 24 horas, e mande para {nome}.
              </Text>
              <Button label="Criar convite" icon="link" onPress={onCreate} loading={busy} />
            </Card>

            <View style={styles.orDivider}>
              <View style={[styles.orLine, { backgroundColor: theme.colors.border }]} />
              <Text variant="overline" color="textFaint">
                ou
              </Text>
              <View style={[styles.orLine, { backgroundColor: theme.colors.border }]} />
            </View>

            <Card>
              <Text variant="heading" color="text">
                Tenho um código
              </Text>
              <Text variant="subhead" color="textMuted" style={styles.cardHint}>
                Cole o convite recebido. Depois de usado, ele deixa de funcionar.
              </Text>
              <TextField value={code} onChangeText={setCode} placeholder="A1B2 C3D4 E5F6 G7H8" autoCapitalize="characters" />
              <Button label="Conectar" icon="users" onPress={onJoin} loading={busy} disabled={!code.trim()} fullWidth />
            </Card>
          </>
        )}

        {error ? (
          <Text variant="subhead" color="accent" align="center" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <BackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { marginBottom: spacing.xxl },
  perspectiveCard: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  codeHint: { marginTop: spacing.sm },
  codePlate: {
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  // The one sanctioned type override: the code breathes, spaced letter by letter.
  code: { letterSpacing: 2 },
  sibling: { marginTop: spacing.md },
  people: { gap: spacing.md, marginTop: spacing.md },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  personDivider: { height: StyleSheet.hairlineWidth },
  moodRow: { marginTop: spacing.md },
  moodAge: { marginTop: spacing.xs },
  moodEmpty: { marginTop: spacing.sm },
  presence: { marginTop: spacing.xs },
  checkinHint: { marginTop: spacing.sm },
  dot: { width: 16, height: 16, borderRadius: radius.pill },
  cardAction: { marginTop: spacing.lg },
  cardHint: { marginTop: spacing.xs, marginBottom: spacing.lg },
  ghostFirst: { marginTop: spacing.xxl },
  ghostNext: { marginTop: spacing.xs },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  error: { marginTop: spacing.lg },
});
