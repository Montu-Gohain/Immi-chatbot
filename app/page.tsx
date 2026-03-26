"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Calendar, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppointmentBooking from "./components/AppointmentBooking";

// ─────────────────────────────────────────────────────────────
// Brand tokens
// ─────────────────────────────────────────────────────────────
const BRAND = {
  crimsonDeep: "#6B0000",
  crimson: "#8B0000",
  crimsonMid: "#A50000",
  crimsonBright: "#C41E1E",
  crimsonGlow: "rgba(139,0,0,0.18)",
  parchment: "#FDF8F5",
  surface: "#FFFFFF",
  surfaceWarm: "#FEF9F7",
  border: "#F0E8E4",
  borderStrong: "#DDD0CB",
  textPrimary: "#1A0A0A",
  textSecondary: "#6B4040",
  textMuted: "#9E7070",
  userBubble: "#8B0000",
  userBubble2: "#6B0000",
};

// ─────────────────────────────────────────────────────────────
// useIsMobile hook
// ─────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type ConsultPromptState = "idle" | "yes" | "no";

interface Message {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  isApiResponse?: boolean;
  showBooking?: boolean;
  consultPrompt?: ConsultPromptState;
}

interface ConversationHistoryItem {
  role: string;
  content: string;
}

interface ApiResponse {
  message: string;
  isRelevant: boolean;
  tokensUsed: number;
  model: string;
  conversationId: string;
  finishReason: string;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────
// Booking trigger detection
// ─────────────────────────────────────────────────────────────
const BOOKING_TRIGGERS = [
  "book an appointment",
  "schedule an appointment",
  "make an appointment",
  "book a consultation",
  "schedule a consultation",
  "i want to book",
  "i'd like to book",
  "i would like to book",
  "book appointment",
];
const isBookingIntent = (msg: string) => {
  const lower = msg.toLowerCase();
  return BOOKING_TRIGGERS.some((t) => lower.includes(t));
};

// ─────────────────────────────────────────────────────────────
// Consultation Prompt Card
// ─────────────────────────────────────────────────────────────
interface ConsultPromptProps {
  state: ConsultPromptState;
  onYes: () => void;
  onNo: () => void;
}

function ConsultPromptCard({ state, onYes, onNo }: ConsultPromptProps) {
  const isMobile = useIsMobile(480);

  if (state === "no") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
          padding: "10px 14px",
          background: BRAND.surfaceWarm,
          borderRadius: 10,
          border: `1px solid ${BRAND.border}`,
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke={BRAND.textMuted}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <p style={{ fontSize: 13, color: BRAND.textSecondary, margin: 0 }}>
          No problem! Feel free to ask if you need anything else.
        </p>
      </div>
    );
  }
  if (state === "yes") return null;

  return (
    <div
      style={{
        marginTop: 12,
        padding: isMobile ? "14px" : "18px 20px",
        background: `linear-gradient(135deg, #FFF5F5 0%, #FFF0EE 100%)`,
        border: `1px solid #F5C6C6`,
        borderRadius: 14,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: `0 4px 20px rgba(139,0,0,0.08)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            flexShrink: 0,
            background: `linear-gradient(135deg, ${BRAND.crimson}, ${BRAND.crimsonBright})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 3px 12px ${BRAND.crimsonGlow}`,
          }}
        >
          <Calendar size={16} color="white" />
        </div>
        <div>
          <p
            style={{
              fontSize: isMobile ? 13 : 14,
              fontWeight: 700,
              color: BRAND.crimsonDeep,
              margin: "0 0 4px",
            }}
          >
            Book a free consultation with our immigration attorney
          </p>
          <p
            style={{
              fontSize: 12,
              color: BRAND.textSecondary,
              margin: 0,
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "#DCFCE7",
                color: "#15803d",
                padding: "2px 9px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                border: "1px solid #BBF7D0",
              }}
            >
              ✦ FREE
            </span>
            Your first consultation is completely free.
          </p>
        </div>
      </div>

      {/* Buttons — stack on mobile */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 8,
        }}
      >
        <button
          onClick={onYes}
          style={{
            flex: isMobile ? undefined : 1,
            width: isMobile ? "100%" : undefined,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: isMobile ? "13px 16px" : "11px 16px",
            background: `linear-gradient(135deg, ${BRAND.crimson}, ${BRAND.crimsonBright})`,
            color: "white",
            border: "none",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
            boxShadow: `0 3px 14px ${BRAND.crimsonGlow}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Calendar size={14} />
          Yes, book my free consultation
        </button>
        <button
          onClick={onNo}
          style={{
            width: isMobile ? "100%" : undefined,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            padding: isMobile ? "13px 16px" : "11px 16px",
            background: "white",
            color: BRAND.textSecondary,
            border: `1px solid ${BRAND.borderStrong}`,
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = BRAND.crimsonBright;
            e.currentTarget.style.color = BRAND.crimson;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = BRAND.borderStrong;
            e.currentTarget.style.color = BRAND.textSecondary;
          }}
        >
          <X size={13} />
          No, I&apos;m good
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const isMobile = useIsMobile(640);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm **Immi**, your US immigration assistant from **Hart Advisors**. I can help you with questions about visas, green cards, citizenship, and other immigration matters.\n\nYou can ask your questions in **any language you prefer**, and I'll do my best to assist you.\n\nHow can I assist you today?",
    },
  ]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [bookingIndex, setBookingIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, bookingIndex]);

  const setConsultPromptState = (
    msgIndex: number,
    state: ConsultPromptState,
  ) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === msgIndex ? { ...m, consultPrompt: state } : m)),
    );
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    if (isBookingIntent(userMessage)) {
      setMessages((prev) => {
        const next = [
          ...prev,
          {
            role: "assistant" as const,
            content:
              "Of course! Please select a date and time below, and an immigration consultant will confirm your appointment within 1–2 business days.",
            showBooking: true,
          },
        ];
        setBookingIndex(next.length - 1);
        return next;
      });
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", isTyping: true },
    ]);
    setIsLoading(true);

    try {
      const conversationHistory: ConversationHistoryItem[] = messages.map(
        (m) => ({ role: m.role, content: m.content }),
      );
      const response = await fetch(
        "https://8ufqzsm271.execute-api.us-east-2.amazonaws.com/dev/api/ai-chatbot-immi-claude",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage, conversationHistory }),
        },
      );
      const data: ApiResponse = await response.json();
      const assistantMessage = data.message;

      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex < assistantMessage.length) {
          currentIndex++;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantMessage.slice(0, currentIndex),
              isTyping: true,
            };
            return updated;
          });
        } else {
          clearInterval(typeInterval);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantMessage,
              isTyping: false,
              isApiResponse: true,
              consultPrompt: "idle",
            };
            return updated;
          });
        }
      }, 10);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please make sure the API server is running and try again.",
          isTyping: false,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBookingConfirm = (date: Date, time: string) => {
    const formatted = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setTimeout(() => {
      setBookingIndex(null);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Your appointment has been requested for **${formatted} at ${time}**. You'll receive confirmation once our team reviews your slot.`,
        },
      ]);
    }, 2000);
  };

  // Avatar size: smaller on mobile
  const avatarSize = isMobile ? 28 : 34;
  // Indent for consult prompt / booking widget (avatar width + gap)
  const assistantIndent = isMobile ? avatarSize + 8 : avatarSize + 12;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: BRAND.parchment,
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <header
        style={{
          background: `linear-gradient(135deg, ${BRAND.crimsonDeep} 0%, ${BRAND.crimson} 100%)`,
          borderBottom: `1px solid ${BRAND.crimsonDeep}`,
          boxShadow: "0 4px 24px rgba(107,0,0,0.35)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: isMobile ? "0 14px" : "0 20px",
            height: isMobile ? 54 : 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 8 : 12,
            }}
          >
            <div
              style={{
                width: isMobile ? 32 : 40,
                height: isMobile ? 32 : 40,
                borderRadius: 10,
                background: "rgba(255,255,255,0.15)",
                border: "1.5px solid rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(8px)",
                flexShrink: 0,
              }}
            >
              <svg
                width={isMobile ? 16 : 20}
                height={isMobile ? 16 : 20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v18M3 9l9-6 9 6M5 9l-2 6h4L5 9zM19 9l-2 6h4l-2-6z" />
                <line x1="3" y1="21" x2="21" y2="21" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: isMobile ? 14 : 17,
                  fontWeight: 800,
                  color: "white",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontFamily: "'Georgia', serif",
                }}
              >
                Hart Advisors
              </div>
              {/* Hide subtitle on very small screens */}
              {!isMobile && (
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.65)",
                    letterSpacing: "0.08em",
                    fontFamily: "sans-serif",
                  }}
                >
                  US IMMIGRATION · LEGAL COUNSEL
                </div>
              )}
            </div>
          </div>

          {/* Immi badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 30,
              padding: isMobile ? "5px 10px" : "6px 14px",
              backdropFilter: "blur(8px)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#4ADE80",
                boxShadow: "0 0 6px #4ADE80",
              }}
            />
            <span
              style={{
                fontSize: isMobile ? 11 : 13,
                color: "rgba(255,255,255,0.9)",
                fontFamily: "sans-serif",
                fontWeight: 500,
              }}
            >
              {isMobile ? "Online" : "Immi is online"}
            </span>
          </div>
        </div>
      </header>

      {/* ── Messages ─────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: isMobile ? "16px 12px" : "28px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? 16 : 24,
          }}
        >
          {messages.map((message, index) => (
            <div key={index}>
              <div
                style={{
                  display: "flex",
                  flexDirection:
                    message.role === "user" ? "row-reverse" : "row",
                  gap: isMobile ? 8 : 12,
                  alignItems: "flex-start",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: isMobile ? 8 : 10,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      message.role === "assistant"
                        ? `linear-gradient(135deg, ${BRAND.crimson}, ${BRAND.crimsonBright})`
                        : `linear-gradient(135deg, #374151, #1F2937)`,
                    boxShadow:
                      message.role === "assistant"
                        ? `0 3px 12px ${BRAND.crimsonGlow}`
                        : "0 3px 12px rgba(0,0,0,0.2)",
                  }}
                >
                  {message.role === "assistant" ? (
                    <Bot size={isMobile ? 14 : 17} color="white" />
                  ) : (
                    <User size={isMobile ? 14 : 17} color="white" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    // On mobile, allow bubbles to use more of the screen width
                    maxWidth: isMobile ? "88%" : "78%",
                    background:
                      message.role === "user"
                        ? `linear-gradient(135deg, ${BRAND.userBubble}, ${BRAND.userBubble2})`
                        : BRAND.surface,
                    color:
                      message.role === "user" ? "white" : BRAND.textPrimary,
                    borderRadius:
                      message.role === "user"
                        ? "18px 4px 18px 18px"
                        : "4px 18px 18px 18px",
                    padding: isMobile ? "10px 13px" : "13px 17px",
                    fontSize: isMobile ? 13 : 14,
                    lineHeight: 1.7,
                    boxShadow:
                      message.role === "user"
                        ? `0 4px 20px ${BRAND.crimsonGlow}`
                        : `0 2px 12px rgba(0,0,0,0.07)`,
                    border:
                      message.role === "assistant"
                        ? `1px solid ${BRAND.border}`
                        : "none",
                    // Prevent long words / URLs from overflowing on mobile
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {message.role === "user" ? (
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {message.content}
                    </div>
                  ) : (
                    <div
                      style={{ fontFamily: "sans-serif" }}
                      className="prose-hart"
                    >
                      <style>{`
                        .prose-hart p { margin: 0 0 8px; color: ${BRAND.textPrimary}; }
                        .prose-hart p:last-child { margin-bottom: 0; }
                        .prose-hart strong { color: ${BRAND.crimsonDeep}; font-weight: 700; }
                        .prose-hart ul, .prose-hart ol { margin: 8px 0; padding-left: 20px; }
                        .prose-hart li { margin: 4px 0; color: ${BRAND.textPrimary}; }
                        .prose-hart h1,.prose-hart h2,.prose-hart h3 {
                          color: ${BRAND.crimsonDeep}; font-weight: 700; margin: 12px 0 6px;
                          font-family: Georgia, serif;
                        }
                        .prose-hart a { color: ${BRAND.crimsonBright}; text-decoration: none; }
                        .prose-hart a:hover { text-decoration: underline; }
                        .prose-hart code {
                          background: #FFF0EE; color: ${BRAND.crimson};
                          padding: 1px 5px; border-radius: 4px; font-size: 12px;
                        }
                        .prose-hart blockquote {
                          border-left: 3px solid ${BRAND.crimsonBright};
                          padding-left: 12px; margin: 8px 0;
                          color: ${BRAND.textSecondary}; font-style: italic;
                        }
                        /* Prevent markdown tables overflowing on mobile */
                        .prose-hart table {
                          width: 100%; border-collapse: collapse; font-size: 12px;
                          display: block; overflow-x: auto;
                        }
                        .prose-hart th, .prose-hart td {
                          padding: 6px 10px; border: 1px solid ${BRAND.border};
                          white-space: nowrap;
                        }
                      `}</style>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                      {message.isTyping && (
                        <span
                          style={{
                            display: "inline-block",
                            width: 3,
                            height: 16,
                            background: BRAND.crimsonBright,
                            marginLeft: 2,
                            verticalAlign: "middle",
                            animation: "blink 1s step-end infinite",
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Consult prompt — indented to align with bubble */}
              {message.role === "assistant" &&
                message.isApiResponse === true &&
                message.consultPrompt !== undefined && (
                  <div style={{ marginLeft: assistantIndent, marginTop: 4 }}>
                    <ConsultPromptCard
                      state={message.consultPrompt}
                      onYes={() => {
                        setConsultPromptState(index, "yes");
                        setBookingIndex(index);
                      }}
                      onNo={() => setConsultPromptState(index, "no")}
                    />
                  </div>
                )}

              {/* Booking widget — full width on mobile, indented on desktop */}
              {message.role === "assistant" &&
                (message.showBooking ||
                  (message.isApiResponse && message.consultPrompt === "yes")) &&
                bookingIndex === index && (
                  <div
                    style={{
                      marginTop: 12,
                      // On mobile, stretch to full container width (no avatar indent)
                      marginLeft: isMobile ? 0 : assistantIndent,
                    }}
                  >
                    <AppointmentBooking
                      onConfirm={handleBookingConfirm}
                      onClose={() => {
                        setBookingIndex(null);
                        if (message.isApiResponse)
                          setConsultPromptState(index, "no");
                      }}
                    />
                  </div>
                )}
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && messages[messages.length - 1]?.content === "" && (
            <div
              style={{
                display: "flex",
                gap: isMobile ? 8 : 12,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: isMobile ? 8 : 10,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `linear-gradient(135deg, ${BRAND.crimson}, ${BRAND.crimsonBright})`,
                }}
              >
                <Bot size={isMobile ? 14 : 17} color="white" />
              </div>
              <div
                style={{
                  background: BRAND.surface,
                  border: `1px solid ${BRAND.border}`,
                  borderRadius: "4px 18px 18px 18px",
                  padding: "14px 18px",
                  display: "flex",
                  gap: 5,
                  alignItems: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: BRAND.crimsonBright,
                      display: "inline-block",
                      animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ── Input bar ────────────────────────────────────────── */}
      <footer
        style={{
          background: BRAND.surface,
          borderTop: `1px solid ${BRAND.border}`,
          padding: isMobile ? "10px 12px 14px" : "16px 20px 20px",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              background: BRAND.parchment,
              border: `1.5px solid ${BRAND.borderStrong}`,
              borderRadius: 14,
              padding: isMobile ? "5px 5px 5px 12px" : "6px 6px 6px 16px",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocusCapture={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor =
                BRAND.crimson;
              (e.currentTarget as HTMLDivElement).style.boxShadow =
                `0 0 0 3px ${BRAND.crimsonGlow}`;
            }}
            onBlurCapture={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor =
                BRAND.borderStrong;
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                isMobile
                  ? "Ask about visas, green cards…"
                  : "Ask about visas, green cards, citizenship… or type 'book an appointment'"
              }
              rows={1}
              disabled={isLoading}
              style={{
                flex: 1,
                resize: "none",
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: isMobile ? 13 : 14,
                color: BRAND.textPrimary,
                fontFamily: "sans-serif",
                lineHeight: 1.6,
                paddingTop: 6,
                paddingBottom: 6,
                minHeight: 36,
                maxHeight: 120,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              style={{
                width: isMobile ? 36 : 40,
                height: isMobile ? 36 : 40,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                border: "none",
                cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
                background:
                  input.trim() && !isLoading
                    ? `linear-gradient(135deg, ${BRAND.crimson}, ${BRAND.crimsonBright})`
                    : BRAND.border,
                transition: "all 0.15s",
                boxShadow:
                  input.trim() && !isLoading
                    ? `0 3px 14px ${BRAND.crimsonGlow}`
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (input.trim() && !isLoading)
                  (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              }}
            >
              <Send
                size={isMobile ? 14 : 16}
                color={input.trim() && !isLoading ? "white" : BRAND.textMuted}
              />
            </button>
          </div>

          <p
            style={{
              textAlign: "center",
              fontSize: isMobile ? 10 : 11,
              color: BRAND.textMuted,
              marginTop: 8,
              fontFamily: "sans-serif",
              lineHeight: 1.5,
            }}
          >
            Immi provides general information only. For legal advice, consult a
            qualified immigration attorney.
          </p>
        </div>
      </footer>

      {/* Global keyframe animations */}
      <style>{`
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${BRAND.borderStrong}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${BRAND.crimsonBright}; }
        /* Prevent horizontal scroll on mobile */
        html, body { overflow-x: hidden; max-width: 100%; }
      `}</style>
    </div>
  );
}
