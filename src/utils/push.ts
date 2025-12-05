
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush() {
    // FIX: Cast to any to avoid type error as VITE_VAPID_PUBLIC_KEY is not in the global ImportMeta definition
    const vapidPublicKey = (import.meta.env as any).VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
        console.error("VAPID public key not found in environment variables (VITE_VAPID_PUBLIC_KEY).");
        return null;
    }
    
    try {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service workers are not supported in this browser.');
            return null;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        return subscription;
    } catch (error) {
        console.error("Failed to subscribe to push notifications:", error);
        return null;
    }
}