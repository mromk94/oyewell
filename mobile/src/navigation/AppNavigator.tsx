import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { HomeScreen } from '../screens/customer/HomeScreen';
import { FoodDetailScreen } from '../screens/customer/FoodDetailScreen';
import { CookListingDetailScreen } from '../screens/customer/CookListingDetailScreen';
import { CartScreen } from '../screens/customer/CartScreen';
import { TrackOrderScreen } from '../screens/customer/TrackOrderScreen';
import { WalletScreen } from '../screens/customer/WalletScreen';
import { OrdersScreen } from '../screens/customer/OrdersScreen';
import { CookDashboardScreen } from '../screens/cook/CookDashboardScreen';
import { CookListingsScreen } from '../screens/cook/CookListingsScreen';
import { CookListingFormScreen } from '../screens/cook/CookListingFormScreen';
import { CookApplyScreen } from '../screens/cook/CookApplyScreen';
import { RiderDashboardScreen } from '../screens/rider/RiderDashboardScreen';
import { AdminDashboardScreen } from '../screens/management/AdminDashboardScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { LandingScreen } from '../screens/LandingScreen';
import { AccountScreen } from '../screens/customer/AccountScreen';
import { PaymentProofScreen } from '../screens/customer/PaymentProofScreen';
import { RiderApplyScreen } from '../screens/customer/RiderApplyScreen';
import { colors } from '../theme';
import type { CookListing } from '../lib/cookApi';
import type { PaymentMethod, OrderSummary } from '../lib/api';
import { Home, User, ShoppingCart, Wallet, Package, ChefHat, Bike, Shield } from 'lucide-react-native';

export type RootStackParamList = {
  Landing: undefined;
  MainTabs: undefined;
  Auth: { mode?: 'signin' | 'register' | 'forgot'; next?: 'Cart' };
  Food: { slug: string };
  CookListing: { id: string };
  CookListingForm: { listing?: CookListing };
  CookApply: undefined;
  Track: { orderNumber: string; initialOrder?: OrderSummary };
  Cart: undefined;
  PaymentProof: { paymentId: string; orderNumber: string; method: PaymentMethod };
  RiderApply: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function CustomerTabs() {
  const { count } = useCart();
  const { user } = useAuth();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: user ? 'flex' : 'none', backgroundColor: colors.brand900, borderTopWidth: 0 },
        tabBarActiveTintColor: colors.brand100,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <Home size={20} color={color} />, tabBarStyle: { display: 'none' } }}
      />
      {user && (
        <Tabs.Screen
          name="Orders"
          component={OrdersScreen}
          options={{ tabBarIcon: ({ color }: { color: string }) => <Package size={20} color={color} /> }}
        />
      )}
      {user && (
        <Tabs.Screen
          name="Cart"
          component={CartScreen}
          options={{ tabBarBadge: count > 0 ? count : undefined, tabBarIcon: ({ color }: { color: string }) => <ShoppingCart size={20} color={color} /> }}
        />
      )}
      {user && (
        <Tabs.Screen
          name="Wallet"
          component={WalletScreen}
          options={{ tabBarIcon: ({ color }: { color: string }) => <Wallet size={20} color={color} /> }}
        />
      )}
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
        name="Listings"
        component={CookListingsScreen}
        options={{ tabBarIcon: ({ color }: { color: string }) => <Package size={20} color={color} /> }}
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
            <Stack.Screen name="Food" component={FoodDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CookListing" component={CookListingDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CookListingForm" component={CookListingFormScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CookApply" component={CookApplyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Track" component={TrackOrderScreen} options={{ headerShown: false }} />
            <Stack.Screen name="PaymentProof" component={PaymentProofScreen} options={{ headerShown: false }} />
            <Stack.Screen name="RiderApply" component={RiderApplyScreen} options={{ headerShown: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
            <Stack.Screen name="MainTabs" component={RoleTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Food" component={FoodDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CookListing" component={CookListingDetailScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CookListingForm" component={CookListingFormScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CookApply" component={CookApplyScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
