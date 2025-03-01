
/**
 * Create a WebSocket connection for live data updates
 * @param endpoint WebSocket endpoint
 * @param onMessage Message handler function
 * @returns WebSocket instance and cleanup function
 */
export const createWebSocketConnection = (
  endpoint: string,
  onMessage: (data: any) => void
): { socket: WebSocket; cleanup: () => void } => {
  const socket = new WebSocket(endpoint);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('WebSocket message parse error:', error);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  const cleanup = () => {
    if (socket.readyState === 1) {
      socket.close();
    }
  };

  return { socket, cleanup };
};

/**
 * Subscribe to specific WebSocket channels
 * @param socket WebSocket instance
 * @param channels Array of channel names
 */
export const subscribeToChannels = (socket: WebSocket, channels: string[]): void => {
  if (socket.readyState === 1) {
    const message = {
      type: 'subscribe',
      channels,
    };
    socket.send(JSON.stringify(message));
  }
};

