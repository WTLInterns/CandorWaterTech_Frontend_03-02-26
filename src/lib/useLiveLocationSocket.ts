import { useEffect, useRef, useState } from "react";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export type LiveLocationMessage = {
  agentId: number;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: string;
  address?: string | null;
};

type Subscriber = (msg: LiveLocationMessage) => void;

type SocketState = {
  connected: boolean;
  lastError?: string;
};

let sharedClient: Client | null = null;
let sharedSubscription: StompSubscription | null = null;
const subscribers = new Set<Subscriber>();
let connectionState: SocketState = { connected: false };
const stateListeners = new Set<(s: SocketState) => void>();

function notifyState() {
  for (const fn of stateListeners) fn(connectionState);
}

function ensureClient() {
  if (sharedClient) return sharedClient;

  const wsUrl =
    process.env.NEXT_PUBLIC_WS_URL ??
    "http://localhost:8089/api/v1/ws";

  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    reconnectDelay: 5000,
    onConnect: () => {
      connectionState = { connected: true };
      notifyState();

      if (!sharedSubscription) {
        sharedSubscription = client.subscribe(
          "/topic/locations",
          (message: IMessage) => {
            let parsed: unknown;
            try {
              parsed = JSON.parse(message.body);
            } catch {
              return;
            }

            const list = Array.isArray(parsed) ? parsed : [parsed];
            for (const item of list) {
              if (!item || typeof item !== "object") continue;
              const anyItem = item as Record<string, unknown>;
              const agentId = Number(anyItem.agentId);
              if (!Number.isFinite(agentId)) continue;

              const msg: LiveLocationMessage = {
                agentId,
                latitude:
                  anyItem.latitude == null ? null : Number(anyItem.latitude),
                longitude:
                  anyItem.longitude == null ? null : Number(anyItem.longitude),
                accuracy:
                  anyItem.accuracy == null ? null : Number(anyItem.accuracy),
                timestamp: String(anyItem.timestamp ?? new Date().toISOString()),
                address:
                  anyItem.address == null ? null : String(anyItem.address),
              };

              for (const sub of subscribers) sub(msg);
            }
          }
        );
      }
    },
    onDisconnect: () => {
      connectionState = { connected: false };
      notifyState();
    },
    onStompError: (frame) => {
      connectionState = {
        connected: false,
        lastError: frame.headers["message"] ?? "STOMP error",
      };
      notifyState();
    },
    onWebSocketError: () => {
      connectionState = { connected: false, lastError: "WebSocket error" };
      notifyState();
    },
  });

  sharedClient = client;
  client.activate();
  return client;
}

export function useLiveLocationSocket(onMessage: Subscriber) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const [state, setState] = useState<SocketState>(connectionState);

  useEffect(() => {
    ensureClient();

    const subscriber: Subscriber = (msg) => onMessageRef.current(msg);
    subscribers.add(subscriber);

    const listener = (s: SocketState) => setState(s);
    stateListeners.add(listener);

    setState(connectionState);

    return () => {
      subscribers.delete(subscriber);
      stateListeners.delete(listener);
    };
  }, []);

  return state;
}
