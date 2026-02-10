"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Send,
  Loader2,
  LogOut,
  MessageCircle,
  AlertCircle,
  Ticket,
} from "lucide-react";
import {
  isPortalAuthenticated,
  clearPortalToken,
  createPortalConversation,
  getPortalConversation,
  sendPortalMessage,
  PortalChatMessage,
  PortalSendMessageResponse,
} from "@/lib/api";
import { severityColor } from "@/lib/api";

export default function PortalChatPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<PortalChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketCreated, setTicketCreated] = useState<{
    ticket_id: number;
    severity: string;
    status: string;
    tracking_token: string | null;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    if (!isPortalAuthenticated()) {
      router.replace("/portal/login");
      return;
    }
    setAuthenticated(true);
  }, [router]);

  const startOrLoadConversation = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createPortalConversation();
      setConversationId(res.conversation_id);
      const conv = await getPortalConversation(res.conversation_id);
      setMessages(conv.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation.");
    } finally {
      setLoading(false);
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated && conversationId === null && !loading) {
      startOrLoadConversation();
    }
  }, [authenticated, conversationId, loading, startOrLoadConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || conversationId === null) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);
    setError(null);
    setTicketCreated(null);
    try {
      const res: PortalSendMessageResponse = await sendPortalMessage(
        conversationId,
        text
      );
      setMessages((prev) => [
        ...prev,
        {
          role: res.message.role,
          content: res.message.content,
          metadata: res.message.metadata,
          created_at: res.message.created_at ?? undefined,
        },
      ]);
      if (res.ticket_created && res.ticket_id != null) {
        setTicketCreated({
          ticket_id: res.ticket_id,
          severity: res.ticket_severity ?? "P3",
          status: res.ticket_status ?? "open",
          tracking_token: res.tracking_token ?? null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    clearPortalToken();
    router.replace("/portal/login");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-slate-800">
            <Image src="/logo.png" alt="FORGE" fill className="object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">FORGE Support</h1>
            <p className="text-xs text-slate-400">AI-powered service assistant</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </header>

      {/* Ticket created banner */}
      {ticketCreated && (
        <div className="mx-4 mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <Ticket className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-300">
                Service request #{ticketCreated.ticket_id} created
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Priority:{" "}
                <span
                  className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium border ${severityColor(
                    ticketCreated.severity
                  )}`}
                >
                  {ticketCreated.severity}
                </span>{" "}
                — A technician will be assigned shortly.
              </p>
            </div>
          </div>
          {ticketCreated.tracking_token && (
            <a
              href={`/portal/track/${ticketCreated.tracking_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-medium hover:bg-blue-500/30"
            >
              📍 Track Service Request & Technician Location
            </a>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-500 text-white rounded-br-md"
                      : "glass rounded-bl-md text-slate-200"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-medium text-slate-400">
                        FORGE Assistant
                      </span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="glass rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-sm text-slate-400">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {!loading && conversationId !== null && (
        <div className="border-t border-slate-700/50 bg-slate-900/80 backdrop-blur p-4">
          <form
            onSubmit={handleSend}
            className="max-w-3xl mx-auto flex gap-2 items-end"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Describe your issue or ask for help..."
              rows={1}
              className="flex-1 min-h-[44px] max-h-32 resize-y bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white cursor-pointer flex-shrink-0"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
