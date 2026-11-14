import { useColorScheme } from 'react-native';
import { useApp } from '@/store/useApp';

const light = {
  bg: '#F4F9FF', card: '#FFFFFF', text: '#12324A', sub: '#6B8499', primary: '#4A9FE0',
  primarySoft: '#DCEEFC', border: '#E3EEF8', danger: '#D9534F', dangerSoft: '#FBE9E8', ok: '#3BB58A',
};
const dark = {
  bg: '#0C1822', card: '#142634', text: '#E8F3FB', sub: '#8FA9BC', primary: '#5BB0F0',
  primarySoft: '#1B3A52', border: '#1F3647', danger: '#F0807C', dangerSoft: '#3A2022', ok: '#4CC9A0',
};
export type Theme = typeof light;

export function useTheme(): Theme {
  const pref = useApp((s) => s.settings.theme);
  const sys = useColorScheme();
  const mode = pref === 'system' ? sys ?? 'light' : pref;
  return mode === 'dark' ? dark : light;
}
