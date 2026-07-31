import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components';
import { usePersonStore } from '@/stores/usePersonStore';

export default function TabsLayout() {
  const personName = usePersonStore((state) => state.person?.apelido ?? state.person?.nome);
  const profileLabel = personName?.trim().split(/\s+/)[0] || 'Pessoa';
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="jardim" options={{ title: 'Nós' }} />
      <Tabs.Screen name="cofre" options={{ title: 'Memórias' }} />
      <Tabs.Screen name="linha-do-tempo" options={{ title: 'Linha do tempo', href: null }} />
      <Tabs.Screen name="humor" options={{ title: 'Humor', href: null }} />
      <Tabs.Screen name="perfil" options={{ title: profileLabel }} />
    </Tabs>
  );
}
