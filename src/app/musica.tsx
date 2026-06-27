import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AudioPlayer, BackButton, Button, Card, Icon, PressableScale, Text, TextField } from '@/components';
import { radius as radiusTokens, useTheme } from '@/design';
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
import { useSpotifyStore } from '@/stores/useSpotifyStore';

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
        contentContainerStyle={{ paddingTop: insets.top + 64, paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}
      >
        <Text variant="title1" color="text" style={{ marginBottom: 8 }}>
          Música
        </Text>
        <Text variant="serif" color="textSecondary" style={{ marginBottom: 24 }}>
          A trilha de vocês.
        </Text>

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
            <Text variant="subhead" color="textMuted" style={{ marginTop: 4, marginBottom: 14 }}>
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
              <Text variant="body" color="textMuted" style={{ marginBottom: 8 }}>
                Busque e escolha uma música abaixo.
              </Text>
            )}

            {nowPlaying ? (
              <>
                <Text variant="overline" color="accent" style={[styles.label, { marginTop: 24 }]}>
                  Tocando agora
                </Text>
                <TrackCard track={nowPlaying} />
              </>
            ) : null}

            <Text variant="overline" color="textMuted" style={[styles.label, { marginTop: 24 }]}>
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
              style={{ marginTop: 28 }}
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
  return (
    <Card featured={featured}>
      <View style={styles.trackHead}>
        {track.albumArt ? (
          <Image source={track.albumArt} style={styles.art} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.art, { backgroundColor: theme.colors.surfaceElevated }]} />
        )}
        <View style={{ flex: 1 }}>
          <Text variant="callout" color="text" numberOfLines={2}>
            {track.name}
          </Text>
          <Text variant="subhead" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
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
        <View style={{ marginTop: 14 }}>
          <AudioPlayer uri={track.previewUrl} />
        </View>
      ) : null}
      <Button
        label="Abrir no Spotify"
        icon="external-link"
        variant="secondary"
        size="sm"
        onPress={() => Linking.openURL(track.url)}
        style={{ marginTop: 14 }}
      />
    </Card>
  );
}

function TrackRow({ track }: { track: SpotifyTrack }) {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.trackHead}>
        {track.albumArt ? (
          <Image source={track.albumArt} style={styles.artSmall} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.artSmall, { backgroundColor: theme.colors.surfaceElevated }]} />
        )}
        <View style={{ flex: 1 }}>
          <Text variant="callout" color="text" numberOfLines={1}>
            {track.name}
          </Text>
          <Text variant="subhead" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
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
  label: { marginBottom: 10 },
  trackHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  art: { width: 64, height: 64, borderRadius: radiusTokens.md },
  artSmall: { width: 48, height: 48, borderRadius: radiusTokens.sm },
  results: { marginTop: 16, gap: 8 },
});
