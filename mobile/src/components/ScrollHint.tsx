import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '../theme';

interface Props {
  canScrollUp: boolean;
  canScrollDown: boolean;
  onNavigate: (direction: 'up' | 'down') => void;
}

export function ScrollHint({ canScrollUp, canScrollDown, onNavigate }: Props) {
  if (!canScrollUp && !canScrollDown) return null;
  const showDown = canScrollDown;
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => onNavigate(showDown ? 'down' : 'up')}
      activeOpacity={0.8}
    >
      {showDown ? <ChevronDown size={20} color={colors.warning} /> : <ChevronUp size={20} color={colors.warning} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -20,
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.6)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 40,
  },
});
