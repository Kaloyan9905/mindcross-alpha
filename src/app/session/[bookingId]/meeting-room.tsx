"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  LifeBuoy,
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Send,
  Video as VideoIcon,
  VideoOff,
  X,
} from "lucide-react";

import { syncRoomAction, leaveRoomAction } from "@/modules/meeting/actions/room";
import type { OutgoingSignal } from "@/modules/meeting/lib/sync-room";
import type { IceServer } from "@/modules/meeting/lib/ice";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** ~1.2s poll: connection setup should feel near-instant for a scheduled call. */
const POLL_MS = 1200;
/** If a peer has been present this long without connecting, warn about NAT. */
const TROUBLE_MS = 18_000;
const MAX_CHAT_LEN = 2000;

interface RemoteState {
  name: string;
  stream: MediaStream | null;
  connected: boolean;
}

/** Per-peer connection state. */
interface Conn {
  pc: RTCPeerConnection;
  remoteSet: boolean;
  pending: RTCIceCandidateInit[];
  channel: RTCDataChannel | null;
}

interface ChatMsg {
  id: string;
  self: boolean;
  name: string;
  text: string;
}

/** The shape of a signaling payload exchanged over the Postgres channel. */
type SignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export interface MeetingRoomProps {
  bookingId: string;
  selfId: string;
  displayName: string;
  role: "host" | "therapist" | "guest";
  iceServers: IceServer[];
  otherPartyName: string;
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "MC";
}

/** A single remote participant tile; binds the MediaStream to its <video>. */
function RemoteTile({ state }: { state: RemoteState }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (el && state.stream && el.srcObject !== state.stream) {
      el.srcObject = state.stream;
      void el.play?.().catch(() => {});
    }
  }, [state.stream]);

  const live = state.connected && !!state.stream;
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <video
        ref={ref}
        autoPlay
        playsInline
        className={cn("h-full w-full object-cover", live ? "opacity-100" : "opacity-0")}
      />
      {!live ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-lg font-semibold">
            {initials(state.name)}
          </div>
          <p className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Connecting to {state.name}…
          </p>
        </div>
      ) : null}
      <span className="absolute bottom-2 left-2 rounded-md bg-background/70 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
        {state.name}
      </span>
    </div>
  );
}

export function MeetingRoom({
  bookingId,
  selfId,
  role,
  iceServers,
  otherPartyName,
}: MeetingRoomProps) {
  const router = useRouter();
  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const leftRef = React.useRef(false);

  // Shared so the controls (screen-share, chat) can reach live peers.
  const connectionsRef = React.useRef<Map<string, Conn>>(new Map());
  const namesRef = React.useRef<Map<string, string>>(new Map());
  const chatOpenRef = React.useRef(false);
  const msgSeqRef = React.useRef(0);

  const [remotes, setRemotes] = React.useState<Map<string, RemoteState>>(new Map());
  const [micOn, setMicOn] = React.useState(true);
  const [camOn, setCamOn] = React.useState(true);
  const [hasVideo, setHasVideo] = React.useState(true);
  const [sharing, setSharing] = React.useState(false);
  const [mediaReady, setMediaReady] = React.useState(false);
  const [fatal, setFatal] = React.useState<string | null>(null);
  const [trouble, setTrouble] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [chatOpen, setChatOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const [draft, setDraft] = React.useState("");

  const appendMessage = React.useCallback((m: Omit<ChatMsg, "id">) => {
    setMessages((prev) => [...prev, { id: String(msgSeqRef.current++), ...m }]);
    if (!m.self && !chatOpenRef.current) setUnread((u) => u + 1);
  }, []);

  // Keep a ref in sync so the data-channel receive handler can tell whether the
  // chat is open (to decide if a message counts as unread).
  React.useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  function toggleChat() {
    const next = !chatOpen;
    setChatOpen(next);
    if (next) setUnread(0);
  }

  // Bind the local preview once media is ready and the element is mounted.
  React.useEffect(() => {
    if (mediaReady && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      void localVideoRef.current.play?.().catch(() => {});
    }
  }, [mediaReady]);

  React.useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let ticking = false;

    const connections = connectionsRef.current;
    const connectedIds = new Set<string>();
    const firstSeen = new Map<string, number>();
    const missed = new Map<string, number>();
    let outgoing: OutgoingSignal[] = [];

    function send(recipientId: string, payload: SignalPayload) {
      outgoing.push({ recipientId, kind: "signal", payload: JSON.stringify(payload) });
    }

    function patchRemote(peerId: string, patch: Partial<RemoteState>) {
      setRemotes((prev) => {
        const next = new Map(prev);
        const cur = next.get(peerId) ?? { name: "Participant", stream: null, connected: false };
        next.set(peerId, { ...cur, ...patch });
        return next;
      });
    }
    function dropRemote(peerId: string) {
      setRemotes((prev) => {
        if (!prev.has(peerId)) return prev;
        const next = new Map(prev);
        next.delete(peerId);
        return next;
      });
    }

    function wireChannel(peerId: string, ch: RTCDataChannel) {
      const entry = connections.get(peerId);
      if (entry) entry.channel = ch;
      ch.addEventListener("message", (e) => {
        appendMessage({
          self: false,
          name: namesRef.current.get(peerId) || "Participant",
          text: String((e as MessageEvent).data).slice(0, MAX_CHAT_LEN),
        });
      });
    }

    function destroyConnection(peerId: string) {
      const c = connections.get(peerId);
      if (c) {
        try {
          c.channel?.close();
          c.pc.close();
        } catch {
          /* already closed */
        }
        connections.delete(peerId);
      }
      connectedIds.delete(peerId);
      firstSeen.delete(peerId);
      missed.delete(peerId);
      dropRemote(peerId);
    }

    function createConnection(peerId: string, initiator: boolean): Conn {
      const existing = connections.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: iceServers as RTCIceServer[] });
      const entry: Conn = { pc, remoteSet: false, pending: [], channel: null };
      connections.set(peerId, entry);

      const local = localStreamRef.current;
      if (local) for (const track of local.getTracks()) pc.addTrack(track, local);

      pc.addEventListener("icecandidate", (e) => {
        if (e.candidate) send(peerId, { candidate: e.candidate.toJSON() });
      });
      pc.addEventListener("track", (e) => {
        const [stream] = e.streams;
        if (stream) patchRemote(peerId, { stream });
      });
      pc.addEventListener("datachannel", (e) => wireChannel(peerId, e.channel));
      pc.addEventListener("connectionstatechange", () => {
        const st = pc.connectionState;
        if (st === "connected") {
          connectedIds.add(peerId);
          patchRemote(peerId, { connected: true });
          setTrouble(false);
        } else if (st === "failed" || st === "closed") {
          destroyConnection(peerId);
        }
      });

      if (initiator) {
        // Create the data channel before the offer so it's negotiated with it.
        wireChannel(peerId, pc.createDataChannel("chat"));
        void (async () => {
          try {
            await pc.setLocalDescription(await pc.createOffer());
            if (pc.localDescription) send(peerId, { sdp: pc.localDescription });
          } catch {
            destroyConnection(peerId);
          }
        })();
      }
      return entry;
    }

    async function handleSignal(senderId: string, raw: string) {
      let data: SignalPayload;
      try {
        data = JSON.parse(raw) as SignalPayload;
      } catch {
        return;
      }
      const entry = connections.get(senderId) ?? createConnection(senderId, false);

      if (data.sdp) {
        try {
          await entry.pc.setRemoteDescription(data.sdp);
          entry.remoteSet = true;
          for (const c of entry.pending.splice(0)) {
            await entry.pc.addIceCandidate(c).catch(() => {});
          }
          if (data.sdp.type === "offer") {
            await entry.pc.setLocalDescription(await entry.pc.createAnswer());
            if (entry.pc.localDescription) send(senderId, { sdp: entry.pc.localDescription });
          }
        } catch {
          destroyConnection(senderId);
        }
      } else if (data.candidate) {
        if (entry.remoteSet) {
          await entry.pc.addIceCandidate(data.candidate).catch(() => {});
        } else {
          entry.pending.push(data.candidate);
        }
      }
    }

    async function tick() {
      if (!active || ticking) return;
      ticking = true;
      try {
        const out = outgoing;
        outgoing = [];
        let res: Awaited<ReturnType<typeof syncRoomAction>>;
        try {
          res = await syncRoomAction({ bookingId, outgoing: out });
        } catch {
          return; // transient — try again next tick
        }
        if (!active) return;
        if (!res.ok) {
          if (res.error === "not-a-member") {
            setFatal("This session is no longer available to you.");
            if (intervalId) clearInterval(intervalId);
          }
          return;
        }

        const { peers: live, incoming } = res.data;
        const liveIds = new Set(live.map((p) => p.userId));
        const now = Date.now();

        for (const p of live) {
          const name = p.displayName || "Participant";
          namesRef.current.set(p.userId, name);
          patchRemote(p.userId, { name });
          if (!firstSeen.has(p.userId)) firstSeen.set(p.userId, now);
          missed.set(p.userId, 0);
          // Deterministic initiator avoids "glare": lower id calls higher id.
          if (selfId < p.userId) createConnection(p.userId, true);
        }

        // Tear down peers that have gone (allow one missed poll for jitter).
        for (const peerId of Array.from(connections.keys())) {
          if (!liveIds.has(peerId)) {
            const m = (missed.get(peerId) ?? 0) + 1;
            missed.set(peerId, m);
            if (m >= 2) destroyConnection(peerId);
          }
        }

        for (const sig of incoming) {
          if (sig.kind === "bye") {
            destroyConnection(sig.senderId);
          } else {
            await handleSignal(sig.senderId, sig.payload);
          }
        }

        // NAT-trouble hint: a peer that's been here a while but never connected.
        let troubled = false;
        for (const [peerId, seenAt] of firstSeen) {
          if (!connectedIds.has(peerId) && now - seenAt > TROUBLE_MS) troubled = true;
        }
        setTrouble(troubled);
      } finally {
        ticking = false;
      }
    }

    async function init() {
      // Best-effort media: prefer video+audio, fall back to audio, then none.
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (active) setHasVideo(false);
        } catch {
          stream = null;
        }
      }
      if (!active) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      setMediaReady(true);

      await tick();
      intervalId = setInterval(() => void tick(), POLL_MS);
    }

    void init();

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
      connections.forEach((c) => {
        try {
          c.channel?.close();
          c.pc.close();
        } catch {
          /* noop */
        }
      });
      connections.clear();
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      void leaveRoomAction({ bookingId }).catch(() => {});
    };
  }, [bookingId, selfId, iceServers, appendMessage]);

  function leave() {
    if (leftRef.current) return;
    leftRef.current = true;
    void leaveRoomAction({ bookingId }).catch(() => {});
    router.push(role === "therapist" ? "/therapist" : "/account");
  }

  function toggleMic() {
    const s = localStreamRef.current;
    if (!s) return;
    const next = !micOn;
    s.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  }
  function toggleCam() {
    const s = localStreamRef.current;
    if (!s) return;
    const next = !camOn;
    s.getVideoTracks().forEach((t) => (t.enabled = next));
    setCamOn(next);
  }

  /** Swap the outbound video track on every peer (camera <-> screen). */
  function replaceVideoTrack(track: MediaStreamTrack | null) {
    connectionsRef.current.forEach((entry) => {
      const sender = entry.pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) void sender.replaceTrack(track).catch(() => {});
    });
  }

  function stopScreenShare() {
    const cam = localStreamRef.current?.getVideoTracks()[0] ?? null;
    replaceVideoTrack(cam);
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setSharing(false);
  }

  async function toggleScreenShare() {
    if (sharing) {
      stopScreenShare();
      return;
    }
    let screen: MediaStream;
    try {
      screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch {
      return; // user cancelled the picker
    }
    const track = screen.getVideoTracks()[0];
    if (!track) return;
    screenStreamRef.current = screen;
    replaceVideoTrack(track);
    if (localVideoRef.current) localVideoRef.current.srcObject = screen;
    track.addEventListener("ended", () => stopScreenShare());
    setSharing(true);
  }

  function sendChat() {
    const text = draft.trim().slice(0, MAX_CHAT_LEN);
    if (!text) return;
    let delivered = false;
    connectionsRef.current.forEach((entry) => {
      if (entry.channel && entry.channel.readyState === "open") {
        entry.channel.send(text);
        delivered = true;
      }
    });
    if (delivered || connectionsRef.current.size === 0) {
      appendMessage({ self: true, name: "You", text });
    }
    setDraft("");
  }

  const remoteEntries = Array.from(remotes.entries());
  const someoneHere = remoteEntries.length > 0;

  if (fatal) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
        <p className="max-w-sm text-base font-medium">{fatal}</p>
        <Button variant="outline" onClick={leave}>
          Back to my sessions
        </Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">
            Session with {otherPartyName}
          </h1>
          <p className="text-xs text-muted-foreground">
            Private &amp; end-to-end encrypted · peer-to-peer
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={leave} className="shrink-0 gap-1.5">
          <PhoneOff className="h-4 w-4" aria-hidden="true" />
          Leave
        </Button>
      </header>

      {trouble ? (
        <div
          role="status"
          className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-300 sm:px-6"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            Having trouble connecting — your network may be blocking the call. Try
            a different network, or stay on the line a moment longer.
          </span>
        </div>
      ) : null}

      <div className="flex flex-1 overflow-hidden">
        {/* Stage */}
        <div className="relative flex flex-1 items-center justify-center p-4 sm:p-6">
          {someoneHere ? (
            <div
              className={cn(
                "grid w-full max-w-5xl gap-4",
                remoteEntries.length > 1 ? "sm:grid-cols-2" : "grid-cols-1",
              )}
            >
              {remoteEntries.map(([id, state]) => (
                <RemoteTile key={id} state={state} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
                {initials(otherPartyName)}
              </div>
              <div>
                <p className="text-lg font-medium">Waiting for {otherPartyName} to join…</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mediaReady
                    ? "They'll appear here as soon as they arrive."
                    : "Setting up your camera and microphone…"}
                </p>
              </div>
            </div>
          )}

          {/* Local preview (picture-in-picture) */}
          <div className="absolute bottom-4 right-4 w-32 overflow-hidden rounded-xl border border-border bg-card shadow-soft-lg sm:bottom-6 sm:right-6 sm:w-44">
            <div className="relative aspect-video">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "h-full w-full object-cover",
                  (camOn && hasVideo) || sharing ? "opacity-100" : "opacity-0",
                )}
              />
              {!((camOn && hasVideo) || sharing) ? (
                <div className="absolute inset-0 flex items-center justify-center bg-muted text-xs text-muted-foreground">
                  {hasVideo ? "Camera off" : "No camera"}
                </div>
              ) : null}
              <span className="absolute bottom-1 left-1 rounded bg-background/70 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                {sharing ? "Sharing" : "You"}
              </span>
            </div>
          </div>
        </div>

        {/* Chat panel */}
        {chatOpen ? (
          <aside className="flex w-full max-w-xs flex-col border-l border-border bg-card sm:w-80">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">In-call chat</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChatOpen(false)}
                aria-label="Close chat"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <div
              className="flex flex-1 flex-col gap-2 overflow-y-auto p-3"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <p className="m-auto max-w-[14rem] text-center text-xs text-muted-foreground">
                  Messages are peer-to-peer and disappear when the call ends.
                </p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={cn("flex flex-col", m.self ? "items-end" : "items-start")}>
                    <span className="px-1 text-[10px] text-muted-foreground">{m.name}</span>
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm",
                        m.self
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-secondary text-secondary-foreground",
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                ))
              )}
            </div>
            <form
              className="flex items-end gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                sendChat();
              }}
            >
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                rows={1}
                maxLength={MAX_CHAT_LEN}
                placeholder="Message…"
                aria-label="Chat message"
                className="min-h-[40px] flex-1 resize-none"
              />
              <Button type="submit" size="icon" disabled={!draft.trim()} aria-label="Send">
                <Send className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          </aside>
        ) : null}
      </div>

      {/* Crisis note */}
      <div className="mx-auto flex w-full max-w-5xl items-start gap-2 px-4 pb-1 text-[11px] leading-relaxed text-muted-foreground sm:px-6">
        <LifeBuoy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          In an emergency, call your local emergency number (<strong>112</strong> in the EU).
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 border-t border-border px-4 py-4">
        <Button
          variant={micOn ? "outline" : "secondary"}
          size="icon"
          onClick={toggleMic}
          disabled={!mediaReady}
          aria-pressed={!micOn}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
          className="h-12 w-12 rounded-full"
        >
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button
          variant={camOn ? "outline" : "secondary"}
          size="icon"
          onClick={toggleCam}
          disabled={!mediaReady || !hasVideo || sharing}
          aria-pressed={!camOn}
          aria-label={camOn ? "Turn camera off" : "Turn camera on"}
          className="h-12 w-12 rounded-full"
        >
          {camOn ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
        <Button
          variant={sharing ? "default" : "outline"}
          size="icon"
          onClick={toggleScreenShare}
          disabled={!mediaReady}
          aria-pressed={sharing}
          aria-label={sharing ? "Stop sharing screen" : "Share screen"}
          className="hidden h-12 w-12 rounded-full sm:inline-flex"
        >
          <MonitorUp className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleChat}
          aria-pressed={chatOpen}
          aria-label={
            unread > 0 ? `${chatOpen ? "Close" : "Open"} chat, ${unread} new` : chatOpen ? "Close chat" : "Open chat"
          }
          className="relative h-12 w-12 rounded-full"
        >
          <MessageCircle className="h-5 w-5" />
          {unread > 0 && !chatOpen ? (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={leave}
          aria-label="Leave session"
          className="h-12 w-12 rounded-full"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </main>
  );
}
