import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { position: 'absolute', backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="cofre" options={{ title: 'Cofre' }} />
      <Tabs.Screen name="linha-do-tempo" options={{ title: 'Linha' }} />
      <Tabs.Screen name="humor" options={{ title: 'Humor' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
