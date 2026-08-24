import { useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { io, type Socket } from "socket.io-client";
import { SOCKET_BASE_URL } from "../lib/config";

interface ProductViewersMessage {
  type: "product:viewers";
  productId: number;
  viewers: number;
}

function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )accessToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Qwik port of the legacy `useProductViewers` React hook.
 * Connects to the `/products` socket namespace and tracks live viewer count.
 */
export function useProductViewers(productId: string | number | null) {
  const viewers = useSignal(0);
  const connected = useSignal(false);
  const error = useSignal<string | null>(null);

  useVisibleTask$(({ track, cleanup }) => {
    const rawId = track(() => productId);
    const pid = typeof rawId === "string" ? Number(rawId) : rawId;

    if (!pid || pid <= 0) {
      return;
    }

    let socket: Socket | undefined;

    try {
      const token = getAccessToken();

      socket = io(`${SOCKET_BASE_URL}/products`, {
        path: "/socket.io",
        auth: token ? { token } : {},
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
      });

      socket.on("connect", () => {
        connected.value = true;
        error.value = null;
        socket?.emit("product:view", { productId: pid });
      });

      socket.on("disconnect", () => {
        connected.value = false;
      });

      socket.on("connect_error", () => {
        connected.value = false;
        error.value = "Failed to connect to live viewers.";
      });

      socket.on("product:viewers", (message: ProductViewersMessage) => {
        if (message.productId === pid) {
          viewers.value = message.viewers;
        }
      });

      socket.on("error", (data: { message?: string }) => {
        error.value = data.message ?? "Unknown socket error.";
      });
    } finally {
      cleanup(() => {
        socket?.disconnect();
        viewers.value = 0;
        connected.value = false;
      });
    }
  });

  return { viewers, connected, error };
}
