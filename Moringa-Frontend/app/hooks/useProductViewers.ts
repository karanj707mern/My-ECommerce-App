"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_BASE_URL } from "@/lib/config";

interface ProductViewersMessage {
  type: "product:viewers";
  productId: number;
  viewers: number;
}

interface ProductViewersState {
  viewers: number;
  connected: boolean;
  error: string | null;
}

function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )accessToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function useProductViewers(productId: number | string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<ProductViewersState>({
    viewers: 0,
    connected: false,
    error: null,
  });

  const pid = typeof productId === "string" ? Number(productId) : productId;

  const connect = useCallback(() => {
    if (!pid || pid <= 0) return;
    if (socketRef.current?.connected) return;

    const token = getAccessToken();

    const socket = io(`${SOCKET_BASE_URL}/products`, {
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
      socket.emit("product:view", { productId: pid });
    });

    socket.on("disconnect", () => {
      setState((prev) => ({ ...prev, connected: false }));
    });

    socket.on("connect_error", (_error) => {
      setState((prev) => ({
        ...prev,
        connected: false,
        error: "Failed to connect to live viewers.",
      }));
    });

    socket.on("product:viewers", (message: ProductViewersMessage) => {
      if (message.productId === pid) {
        setState((prev) => ({ ...prev, viewers: message.viewers }));
      }
    });

    socket.on("error", (data: { message?: string }) => {
      setState((prev) => ({
        ...prev,
        error: data.message ?? "Unknown socket error.",
      }));
    });

    socketRef.current = socket;
  }, [pid]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState({ viewers: 0, connected: false, error: null });
  }, []);

  useEffect(() => {
    if (!pid || pid <= 0) return;
    connect();
    return () => {
      disconnect();
    };
  }, [pid, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}
