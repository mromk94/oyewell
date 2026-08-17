import React, { useState } from 'react';
import { View, ImageBackground, ActivityIndicator, StyleSheet } from 'react-native';

interface FoodImageProps {
  source: { uri: string };
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  imageStyle?: any;
  children?: React.ReactNode;
}

export function FoodImage({ source, style, resizeMode = 'cover', imageStyle, children }: FoodImageProps) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const uri = source?.uri?.trim();

  if (!uri || error) {
    return (
      <View style={[style, styles.error]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[style]}>
      {!ready && !error && (
        <View style={[StyleSheet.absoluteFill, styles.loader]}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
        </View>
      )}
      <ImageBackground
        source={{ uri }}
        style={{ flex: 1 }}
        resizeMode={resizeMode}
        imageStyle={imageStyle}
        onLoadStart={() => setReady(false)}
        onLoadEnd={() => setReady(true)}
        onError={() => setError(true)}
      >
        {children}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    zIndex: 1,
  },
  error: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
});
