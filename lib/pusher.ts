import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance (for API routes)
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Client-side Pusher instance
export const getPusherClient = () => {
  if (typeof window === 'undefined') return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) {
    console.warn('Real-time updates are unavailable: Pusher client configuration is missing.');
    return null;
  }
  
  const client = new PusherClient(key, {
    cluster,
    channelAuthorization: {
      transport: 'ajax',
      endpoint: '/api/pusher/auth',
      customHandler: async ({ socketId, channelName }, callback) => {
        try {
          const { auth } = await import('@/lib/firebase');
          // Wait for Firebase to restore the persisted session before reading currentUser.
          // auth.authStateReady() is available as an instance method in Firebase 10.14+.
          const authInstance = auth as unknown as { authStateReady?: () => Promise<void> };
          if (typeof authInstance.authStateReady === 'function') {
            await authInstance.authStateReady();
          }
          const user = auth.currentUser;
          if (!user) {
            throw new Error('No Firebase user is signed in.');
          }

          const idToken = await user.getIdToken();
          const response = await fetch('/api/pusher/auth', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Bearer ${idToken}`,
            },
            body: new URLSearchParams({
              socket_id: socketId,
              channel_name: channelName,
            }),
          });

          if (!response.ok) {
            throw new Error(`Pusher authorization failed: ${response.status}`);
          }

          callback(null, await response.json());
        } catch (error) {
          console.warn('Real-time updates are unavailable. API data will continue to refresh normally.');
          callback(error instanceof Error ? error : new Error('Pusher authorization failed.'), null);
        }
      },
    },
  });

  client.connection.bind('error', () => {
    console.warn('Real-time updates are unavailable. API data will continue to refresh normally.');
  });

  return client;
};

// Helper function to trigger events
export async function triggerPusherEvent(channel: string, event: string, data: any) {
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (error) {
    console.error('Error triggering Pusher event:', error);
    throw error;
  }
}
