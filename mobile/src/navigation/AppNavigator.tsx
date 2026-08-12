import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { HomeScreen } from '../screens/customer/HomeScreen';
import { FoodDetailScreen } from '../screens/customer/FoodDetailScreen';
import { CartScreen } from '../screens/customer/CartScreen';
import { TrackOrderScreen } from '../screens/customer/TrackOrderScreen';
import { WalletScreen } from '../screens/customer/WalletScreen';
import { OrdersScreen } from '../screens/customer/OrdersScreen';
import { CookDashboardScreen } from '../screens/cook/CookDashboardScreen';
import { RiderDashboardScreen } from '../screens/rider/RiderDashboardScreen';
import { AdminDashboardScreen } from '../screens/management/AdminDashboardScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { AccountScreen } from '../screens/customer/AccountScreen';
import { PaymentProofScreen } from '../screens/customer/PaymentProofScreen';
import { colors } from '../theme';
import { Home, User, ShoppingCart, Wallet, Package, ChefHat, Bike, Shield } from 'lucide-react-native';

export type RootStackParamList = {
  MainTabs: undefined;
  Auth: { mode?: 'signin' | 'register' | 'forgot' };
  Food: { slug: string };
  Track: { orderNumber: string };
  Cart: undefined;
  PaymentProof: { paymentId: string; orderNumber: string; instructions: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function CustomerTabs() {
  const { count } = useCart();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand900 },
        headerTintColor: colors.white,
        tabBarStyle: { backgroundColor: colors.brand900, borderTopWidth: 0 },
        tabBarActiveTintColor: colors.brand100,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <Home size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <Package size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="Cart"
        component={CartScreen}
        options={{ tabBarBadge: count > 0 ? count : undefined, tabBarIcon: ({ color }: { color: string }) => <ShoppingCart size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <Wallet size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="Account"
        component={AccountScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <User size={20} color={color} /> }}
      />
    </Tabs.Navigator>
  );
}

function CookTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand900 },
        headerTintColor: colors.white,
        tabBarStyle: { backgroundColor: colors.brand900, borderTopWidth: 0 },
        tabBarActiveTintColor: colors.brand100,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        component={CookDashboardScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <ChefHat size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="Account"
        component={AccountScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <User size={20} color={color} /> }}
      />
    </Tabs.Navigator>
  );
}

function RiderTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand900 },
        headerTintColor: colors.white,
        tabBarStyle: { backgroundColor: colors.brand900, borderTopWidth: 0 },
        tabBarActiveTintColor: colors.brand100,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        component={RiderDashboardScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <Bike size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="Account"
        component={AccountScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <User size={20} color={color} /> }}
      />
    </Tabs.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tabs.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand900 },
        headerTintColor: colors.white,
        tabBarStyle: { backgroundColor: colors.brand900, borderTopWidth: 0 },
        tabBarActiveTintColor: colors.brand100,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <Shield size={20} color={color} /> }}
      />
      <Tabs.Screen
        name="Account"
        component={AccountScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <User size={20} color={color} /> }}
      />
    </Tabs.Navigator>
  );
}

function RoleTabs() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'COOK') return <CookTabs />;
  if (role === 'RIDER') return <RiderTabs />;
  if (role === 'ADMIN') return <AdminTabs />;
  return <CustomerTabs />;
}

export function AppNavigator() {
  const { user } = useAuth();
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.brand900 },
          headerTintColor: colors.white,
          contentStyle: { backgroundColor: colors.brand900 },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={RoleTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Food" component={FoodDetailScreen} options={{ title: 'Food' }} />
            <Stack.Screen name="Track" component={TrackOrderScreen} options={{ title: 'Track Order' }} />
            <Stack.Screen name="PaymentProof" component={PaymentProofScreen} options={{ title: 'Payment Proof' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} options={{ title: 'Sign In' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
