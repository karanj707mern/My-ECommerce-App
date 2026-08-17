"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_BASE_URL } from "@/lib/config";

interface OrderUpdateMessage {
  type: "order.updated";
  order: unknown;
}

interface OrderSocketState {
  connected: boolean;
  lastUpdate: OrderUpdateMessage | null;
  error: string | null;
}

function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )accessToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function useOrderSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<OrderSocketState>({
    connected: false,
    lastUpdate: null,
    error: null,
  });

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const token = getAccessToken();

    const socket = io(SOCKET_BASE_URL, {
      path: "/socket.io",
      auth: token ? { token } : {},
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      setState((prev) => ({ ...prev, connected: true, error: null }));
    });

    socket.on("disconnect", () => {
      setState((prev) => ({ ...prev, connected: false }));
    });

    socket.on("connect_error", (_error) => {
      setState((prev) => ({
        ...prev,
        connected: false,
        error: "Failed to connect to order updates.",
      }));
    });

    socket.on("order.updated", (message: OrderUpdateMessage) => {
      setState((prev) => ({
        ...prev,
        lastUpdate: message,
      }));
    });

    socket.on("error", (data: { message?: string }) => {
      setState((prev) => ({
        ...prev,
        error: data.message ?? "Unknown socket error.",
      }));
    });

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState({ connected: false, lastUpdate: null, error: null });
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}
