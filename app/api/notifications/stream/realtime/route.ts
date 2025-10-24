import { NextRequest } from 'next/server';
import { validateFirebaseToken } from '@/lib/middleware/auth';
import { getFirestore, initAdmin } from '@/lib/firebase-admin';

// GET /api/notifications/stream/realtime - Server-Sent Events for real-time notifications
export async function GET(request: NextRequest) {
  try {
    // Validate user authentication
    const user = await validateFirebaseToken(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const userId = user.uid;

    // Create a ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Send initial connection event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to notification stream' })}\n\n`)
        );

        // Set up Firestore listener for real-time updates
        initAdmin();
        const db = getFirestore();
        
        const unsubscribe = db.collection('notifications')
          .where('userId', '==', userId)
          .where('isRead', '==', false)
          .orderBy('createdAt', 'desc')
          .limit(10)
          .onSnapshot(
            (snapshot) => {
              try {
                const notifications: any[] = [];
                snapshot.forEach(doc => {
                  notifications.push({ id: doc.id, ...doc.data() });
                });

                const eventData = {
                  type: 'notifications_update',
                  data: notifications,
                  count: notifications.length,
                  timestamp: new Date().toISOString()
                };

                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`)
                );
              } catch (error) {
                console.error('Error in notification stream:', error);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Stream error occurred' })}\n\n`)
                );
              }
            },
            (error) => {
              console.error('Firestore snapshot error:', error);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Database connection error' })}\n\n`)
              );
            }
          );

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log('Notification stream client disconnected');
          if (unsubscribe) {
            unsubscribe();
          }
          controller.close();
        });
      },
    });

    // Return the SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering for Nginx
      },
    });
  } catch (error: any) {
    console.error('Error setting up notification stream:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Error setting up notification stream',
        error: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Disable static generation for this route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // Use Node.js runtime for long-running connections
