import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';

export function useDeepLinks() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    function handle(url: string | null) {
      if (!url) return;
      const { hostname, path, queryParams } = Linking.parse(url);
      if (path === 'food' && hostname) {
        navigation.navigate('Food', { slug: hostname });
      }
      if (path === 'track' && queryParams?.orderNumber) {
        navigation.navigate('Track', { orderNumber: String(queryParams.orderNumber) });
      }
    }

    Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener('url', (event) => handle(event.url));
    return () => subscription.remove();
  }, [navigation]);
}
