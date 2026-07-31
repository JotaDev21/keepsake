import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AudioPlayer,
  BackButton,
  Button,
  Card,
  Icon,
  PressableScale,
  ScreenHeader,
  Text,
  TextField,
} from '@/components';
import { radius, spacing, useTheme } from '@/design';
import { haptics } from '@/lib/haptics';
import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_SCOPES,
  saveTokens,
  searchTracks,
  spotifyDiscovery,
  spotifyRedirectUri,
  type SpotifyTrack,
} from '@/lib/spotify';
import { startOfDay } from '@/lib/mood';
import { usePersonStore } from '@/stores/usePersonStore';
import { useSpotifyStore } from '@/stores/useSpotifyStore';
import { useSyncStore } from '@/stores/useSyncStore';

WebBrowser.maybeCompleteAuthSession();

export default function Musica() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const configured = useSpotifyStore((s) => s.configured);
  const connected = useSpotifyStore((s) => s.connected);
  const songOfDay = useSpotifyStore((s) => s.songOfDay);
  const nowPlaying = useSpotifyStore((s) => s.nowPlaying);
  const load = useSpotifyStore((s) => s.load);
  const markConnected = useSpotifyStore((s) => s.markConnected);
  const disconnect = useSpotifyStore((s) => s.disconnect);
  const setSong = useSpotifyStore((s) => s.setSong);
  const refreshNowPlaying = useSpotifyStore((s) => s.refreshNowPlaying);
  const partnerSong = useSyncStore((s) => s.partnerSong);
  const nome = usePersonStore((s) => s.person?.nome ?? 'a outra pessoa');
  const partnerSongToday = partnerSong != null && partnerSong.dia === startOfDay();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [searching, setSearching] = useState(false);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: SPOTIFY_CLIENT_ID, scopes: SPOTIFY_SCOPES, usePKCE: true, redirectUri: spotifyRedirectUri },
    spotifyDiscovery,
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (connected) refreshNowPlaying();
  }, [connected, refreshNowPlaying]);

  useEffect(() => {
    if (response?.type === 'success' && request?.codeVerifier) {
      AuthSession.exchangeCodeAsync(
        {
          clientId: SPOTIFY_CLIENT_ID,
          code: response.params.code,
          redirectUri: spotifyRedirectUri,
          extraParams: { code_verifier: request.codeVerifier },
        },
        spotifyDiscovery,
      )
        .then((res) => {
          saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken, expiresIn: res.expiresIn });
          markConnected();
          haptics.success();
        })
        .catch((e) => console.warn('ev: spotify token falhou', e));
    }
  }, [response, request, markConnected]);

  const onSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await searchTracks(query));
    } catch (e) {
      console.warn('ev: busca falhou', e);
    } finally {
      setSearching(false);
    }
  };

  const pick = (t: SpotifyTrack) => {
    haptics.success();
    setSong(t);
    setResults([]);
    setQuery('');
  };

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
        <ScreenHeader title="Música" subtitle="A trilha de vocês." style={styles.header} />

        {/* Her pick reaches you even if this device never connected Spotify. */}
        {partnerSongToday ? (
          <View style={styles.section}>
            <Text variant="overline" color="accent" style={styles.label}>
              A música de {nome} hoje
            </Text>
            <TrackCard track={partnerSong.track} />
          </View>
        ) : null}

        {!configured ? (
          <Card>
            <Text variant="body" color="textMuted">
              O Spotify ainda não está configurado neste app.
            </Text>
          </Card>
        ) : !connected ? (
          <Card featured>
            <Text variant="heading" color="text">
              Conectar Spotify
            </Text>
            <Text variant="subhead" color="textMuted" style={styles.cardHint}>
              Pra escolher a música do dia e ver o que está tocando.
            </Text>
            <Button label="Conectar" icon="music" onPress={() => { haptics.tap(); promptAsync(); }} disabled={!request} />
          </Card>
        ) : (
          <>
            <Text variant="overline" color="accent" style={styles.label}>
              Música do dia
            </Text>
            {songOfDay ? (
              <TrackCard track={songOfDay} featured onRemove={() => setSong(null)} />
            ) : (
              <Text variant="body" color="textMuted">
                Busque e escolha uma música abaixo.
              </Text>
            )}

            {nowPlaying ? (
              <>
                <Text variant="overline" color="accent" style={[styles.label, styles.sectionStart]}>
                  Tocando agora
                </Text>
                <TrackCard track={nowPlaying} />
              </>
            ) : null}

            <Text variant="overline" color="textMuted" style={[styles.label, styles.sectionStart]}>
              Buscar
            </Text>
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder="Nome da música ou artista"
              onSubmitEditing={onSearch}
              returnKeyType="search"
            />
            <Button label="Buscar" icon="search" onPress={onSearch} loading={searching} fullWidth />

            <View style={styles.results}>
              {results.map((t) => (
                <PressableScale key={t.id} onPress={() => pick(t)} accessibilityLabel={t.name}>
                  <TrackRow track={t} />
                </PressableScale>
              ))}
            </View>

            <Button
              label="Desconectar Spotify"
              variant="ghost"
              onPress={() => { haptics.tap(); disconnect(); }}
              style={styles.disconnect}
            />
          </>
        )}
      </ScrollView>

      <BackButton />
    </View>
  );
}

function TrackCard({ track, featured, onRemove }: { track: SpotifyTrack; featured?: boolean; onRemove?: () => void }) {
  const theme = useTheme();
  const frame = { borderColor: theme.colors.border };
  return (
    <Card featured={featured}>
      <View style={styles.trackHead}>
        {track.albumArt ? (
          <Image source={track.albumArt} style={[styles.art, frame]} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.art, frame, { backgroundColor: theme.colors.surfaceElevated }]} />
        )}
        <View style={styles.trackBody}>
          <Text variant="callout" color="text" numberOfLines={2}>
            {track.name}
          </Text>
          <Text variant="subhead" color="textMuted" numberOfLines={1} style={styles.trackArtist}>
            {track.artist}
          </Text>
        </View>
        {onRemove ? (
          <PressableScale onPress={onRemove} accessibilityLabel="Remover" scaleTo={0.9}>
            <Icon name="x" size={18} color="textMuted" />
          </PressableScale>
        ) : null}
      </View>
      {track.previewUrl ? (
        <View style={styles.preview}>
          <AudioPlayer uri={track.previewUrl} />
        </View>
      ) : null}
      <Button
        label="Abrir no Spotify"
        icon="external-link"
        variant="secondary"
        size="sm"
        onPress={() => Linking.openURL(track.url)}
        style={styles.open}
      />
    </Card>
  );
}

function TrackRow({ track }: { track: SpotifyTrack }) {
  const theme = useTheme();
  const frame = { borderColor: theme.colors.border };
  return (
    <Card>
      <View style={styles.trackHead}>
        {track.albumArt ? (
          <Image source={track.albumArt} style={[styles.artSmall, frame]} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.artSmall, frame, { backgroundColor: theme.colors.surfaceElevated }]} />
        )}
        <View style={styles.trackBody}>
          <Text variant="callout" color="text" numberOfLines={1}>
            {track.name}
          </Text>
          <Text variant="subhead" color="textMuted" numberOfLines={1} style={styles.trackArtist}>
            {track.artist}
          </Text>
        </View>
        <Icon name="plus" size={18} color="accent" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { marginBottom: spacing.xxl },
  section: { marginBottom: spacing.xxl },
  sectionStart: { marginTop: spacing.xxl },
  label: { marginBottom: spacing.md },
  cardHint: { marginTop: spacing.xs, marginBottom: spacing.lg },
  trackHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  trackBody: { flex: 1 },
  trackArtist: { marginTop: spacing.xs },
  // Framed art, never naked: rounded corner + hairline edge.
  art: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  artSmall: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  preview: { marginTop: spacing.lg },
  open: { marginTop: spacing.lg },
  results: { marginTop: spacing.lg, gap: spacing.sm },
  disconnect: { marginTop: spacing.xxl },
});
