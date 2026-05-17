// Web-Push-Subscription-Helpers (ELE-182, Wave 3 Server-Push: ELE-XXX).
// Scope dieses Issues: Nur Browser-Permission + Subscription-Setup. Server-Endpoint
// (POST /push/subscriptions) und VAPID-Key-Verteilung kommen in Wave 3.

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export function getPushPermission(): PushPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushPermission;
}

export async function requestPushPermission(): Promise<PushPermission> {
  if (getPushPermission() === 'unsupported') return 'unsupported';
  const result = await Notification.requestPermission();
  return result as PushPermission;
}

export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/**
 * Subscribt den Browser für Web-Push. Aktuell wird die Subscription noch nicht
 * an einen Server geschickt — das ist Wave-3-Scope (Reassignment-Notifications).
 */
export async function subscribeToPush(
  applicationServerKey: string
): Promise<PushSubscription | null> {
  if (getPushPermission() !== 'granted') return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });
}
