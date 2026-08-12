import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/lib/auth';
import { CartProvider } from './src/lib/cart';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useNotifications } from './src/lib/notifications';
import { useDeepLinks } from './src/lib/deepLinks';

function AppRoot() {
  useNotifications();
  useDeepLinks();
  return (
    <AuthProvider>
      <CartProvider>
        <AppNavigator />
        <StatusBar style="light" />
      </CartProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppRoot />
    </SafeAreaProvider>
  );
}
