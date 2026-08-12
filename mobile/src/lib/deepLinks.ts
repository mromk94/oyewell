import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { navigationRef } from '../navigation/AppNavigator';

export function useDeepLinks() {
  useEffect(() => {
    function handle(url: string | null) {
      if (!url) return;
      const { hostname, path, queryParams } = Linking.parse(url);
      if (!navigationRef.current) return;
      if (path === 'food' && hostname) {
        navigationRef.current.navigate('Food', { slug: hostname });
      }
      if (path === 'track' && queryParams?.orderNumber) {
        navigationRef.current.navigate('Track', { orderNumber: String(queryParams.orderNumber) });
      }
    }

    Linking.getInitialURL().then(handle);
    const subscription = Linking.addEventListener('url', (event) => handle(event.url));
    return () => subscription.remove();
  }, []);
}
