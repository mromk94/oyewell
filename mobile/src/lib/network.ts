import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

let online = true;

export function isOnline() {
  return online;
}

export function startNetworkListener() {
  return NetInfo.addEventListener((state: NetInfoState) => {
    online = state.isConnected ?? false;
  });
}

export async function waitForConnection(timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();
  while (!online && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const state = await NetInfo.fetch();
    if (state.isConnected) return true;
  }
  return online;
}
