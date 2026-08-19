import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

export const useSocket = (userId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectCallbacksRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!userId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

    const newSocket = io(socketUrl, {
      transports: ["polling", "websocket"],
      reconnectionAttempts: 10,
    });
    
    newSocket.on("connect", () => {
      console.log("Socket connected on Web:", newSocket.id);
      setIsConnected(true);
      setIsReconnecting(false);
      newSocket.emit("join-room", userId);
      
      // Notify all registered reconnection callbacks
      reconnectCallbacksRef.current.forEach(cb => cb());
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected on Web");
      setIsConnected(false);
      setIsReconnecting(true);
    });

    newSocket.on("reconnect_attempt", () => {
      console.log("Socket reconnection attempt");
      setIsReconnecting(true);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

  const emitEvent = useCallback((eventName: string, data: any) => {
    if (socket) {
      socket.emit(eventName, data);
    }
  }, [socket]);

  const onEvent = useCallback((eventName: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(eventName, callback);
      return () => {
        socket.off(eventName, callback);
      };
    }
    return () => {}; // Return no-op if socket not ready
  }, [socket]);

  const onReconnect = useCallback((callback: () => void) => {
    reconnectCallbacksRef.current.push(callback);
    return () => {
      reconnectCallbacksRef.current = reconnectCallbacksRef.current.filter(cb => cb !== callback);
    };
  }, []);

  return { isConnected, isReconnecting, emitEvent, onEvent, onReconnect, socket };
};
