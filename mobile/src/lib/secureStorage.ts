import * as SecureStore from 'expo-secure-store';

const CUSTOMER_TOKEN_KEY = 'customer_token';
const RIDER_TOKEN_KEY = 'rider_token';
const ADMIN_TOKEN_KEY = 'admin_token';

export async function getToken(role: 'customer' | 'rider' | 'admin'): Promise<string | null> {
  const key = role === 'customer' ? CUSTOMER_TOKEN_KEY : role === 'rider' ? RIDER_TOKEN_KEY : ADMIN_TOKEN_KEY;
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setToken(role: 'customer' | 'rider' | 'admin', token: string): Promise<void> {
  const key = role === 'customer' ? CUSTOMER_TOKEN_KEY : role === 'rider' ? RIDER_TOKEN_KEY : ADMIN_TOKEN_KEY;
  await SecureStore.setItemAsync(key, token);
}

export async function removeToken(role: 'customer' | 'rider' | 'admin'): Promise<void> {
  const key = role === 'customer' ? CUSTOMER_TOKEN_KEY : role === 'rider' ? RIDER_TOKEN_KEY : ADMIN_TOKEN_KEY;
  await SecureStore.deleteItemAsync(key);
}

export async function getActiveToken(): Promise<string | null> {
  return (
    (await getToken('customer')) ??
    (await getToken('rider')) ??
    (await getToken('admin'))
  );
}
