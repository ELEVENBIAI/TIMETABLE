import { useIsDesktop } from '@/hooks/useMediaQuery';
import { DesktopLayout } from './DesktopLayout';
import { MobileLayout } from './MobileLayout';

export function AdaptiveLayout() {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
}
