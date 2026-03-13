"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Calendar, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type ConsultPromptState = "idle" | "yes" | "no";

interface Message {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  isApiResponse?: boolean; // true for messages that came from the API
  showBooking?: boolean; // true when triggered by booking intent
  consultPrompt?: ConsultPromptState; // state of the "need appointment?" prompt
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
  if (state === "no") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
          padding: "10px 14px",
          background: "#f8fafc",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
          No problem! Feel free to ask if you need anything else.
        </p>
      </div>
    );
  }

  if (state === "yes") {
    // Booking widget is shown separately; show a small acknowledged state here
    return null;
  }

  // idle — show the prompt
  return (
    <div
      style={{
        marginTop: 12,
        padding: "16px 18px",
        background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
        border: "1px solid #c7d2fe",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Question */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            flexShrink: 0,
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Calendar size={15} color="white" />
        </div>
        <div>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#1e3a8a",
              margin: "0 0 2px",
            }}
          >
            Do you need an appointment with our immigration attorney from USA?
          </p>
          <p
            style={{
              fontSize: 13,
              color: "#4338ca",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "#dcfce7",
                color: "#15803d",
                padding: "1px 8px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                border: "1px solid #bbf7d0",
              }}
            >
              ✦ FREE
            </span>
            The first consultation is completely free.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onYes}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "10px 16px",
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            color: "white",
            border: "none",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            transition: "opacity 0.15s",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Calendar size={14} />
          Yes, please! Book my free consultation
        </button>
        <button
          onClick={onNo}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            padding: "10px 16px",
            background: "white",
            color: "#64748b",
            border: "1px solid #cbd5e1",
            borderRadius: 9,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#94a3b8";
            e.currentTarget.style.color = "#475569";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.color = "#64748b";
          }}
        >
          <X size={13} />
          No, I&apos;m good for now
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AppointmentBooking (inline, same as before)
// ─────────────────────────────────────────────────────────────
const TIME_SLOTS = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM",
  "8:00 PM",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

interface AppointmentBookingProps {
  onConfirm: (date: Date, time: string) => void;
  onClose: () => void;
}

function AppointmentBooking({ onConfirm, onClose }: AppointmentBookingProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const isPast = (day: number) => new Date(viewYear, viewMonth, day) < today;
  const isSelected = (day: number) =>
    !!selectedDate &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear;
  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const selectDay = (day: number) => {
    if (isPast(day)) return;
    setSelectedDate(new Date(viewYear, viewMonth, day));
    setSelectedTime(null);
  };

  const handleSubmit = () => {
    if (!selectedDate || !selectedTime) return;
    setSubmitted(true);
    onConfirm(selectedDate, selectedTime);
  };

  if (submitted && selectedDate && selectedTime) {
    return (
      <div style={bs.wrapper}>
        <div
          style={{
            padding: "40px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#dcfce7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#0f172a",
              margin: 0,
            }}
          >
            Appointment Requested!
          </p>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "#16a34a",
              margin: 0,
            }}
          >
            {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()},{" "}
            {selectedDate.getFullYear()} · {selectedTime}
          </p>
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              maxWidth: 340,
              lineHeight: 1.6,
              margin: "4px 0 8px",
            }}
          >
            A consultant will confirm your slot within 1–2 business days.
          </p>
          <button onClick={onClose} style={bs.closeBtn}>
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={bs.wrapper}>
      <div style={bs.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={bs.headerIcon}>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
              }}
            >
              Schedule a Consultation
            </p>
            <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
              Select a date & time with an immigration expert
            </p>
          </div>
        </div>
        <button onClick={onClose} style={bs.xBtn}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="2" y1="2" x2="14" y2="14" />
            <line x1="14" y1="2" x2="2" y2="14" />
          </svg>
        </button>
      </div>

      <div style={bs.body}>
        {/* Calendar */}
        <div style={bs.calPanel}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <button style={bs.navBtn} onClick={prevMonth}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="10,3 5,8 10,13" />
              </svg>
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button style={bs.navBtn} onClick={nextMonth}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6,3 11,8 6,13" />
              </svg>
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              marginBottom: 6,
            }}
          >
            {DAYS.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  padding: "3px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gap: 3,
            }}
          >
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const past = isPast(day),
                sel = isSelected(day),
                tod = isToday(day),
                hov = hoveredDay === day && !past && !sel;
              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  onMouseEnter={() => !past && setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  disabled={past}
                  style={{
                    aspectRatio: "1",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: sel || tod ? 700 : 500,
                    cursor: past ? "not-allowed" : "pointer",
                    transition: "all 0.12s",
                    fontFamily: "inherit",
                    background: sel
                      ? "#2563eb"
                      : tod
                        ? "#dbeafe"
                        : hov
                          ? "#f1f5f9"
                          : "transparent",
                    color: sel
                      ? "#fff"
                      : tod
                        ? "#1d4ed8"
                        : past
                          ? "#cbd5e1"
                          : "#334155",
                    boxShadow: sel ? "0 2px 6px rgba(37,99,235,0.35)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid #f1f5f9",
            }}
          >
            {[
              { color: "#1d4ed8", bg: "#dbeafe", label: "Today" },
              { color: "#fff", bg: "#2563eb", label: "Selected" },
              { color: "#cbd5e1", bg: "transparent", label: "Unavailable" },
            ].map((l) => (
              <span
                key={l.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 11,
                  color: "#94a3b8",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: l.bg,
                    border: `1px solid ${l.color}`,
                    display: "inline-block",
                  }}
                />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* Time slots */}
        <div style={bs.timesPanel}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#0f172a",
              margin: "0 0 2px",
            }}
          >
            {selectedDate
              ? `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}`
              : "Select a date"}
          </p>
          <p
            style={{
              fontSize: 11,
              color: "#94a3b8",
              margin: "0 0 14px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Available · 1 hr each
          </p>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
          >
            {TIME_SLOTS.map((slot) => {
              const active = selectedTime === slot,
                disabled = !selectedDate;
              return (
                <button
                  key={slot}
                  disabled={disabled}
                  onClick={() => !disabled && setSelectedTime(slot)}
                  style={{
                    padding: "9px 6px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "all 0.12s",
                    fontFamily: "inherit",
                    textAlign: "center",
                    background: active
                      ? "#2563eb"
                      : disabled
                        ? "#f1f5f9"
                        : "#fff",
                    color: active ? "#fff" : disabled ? "#cbd5e1" : "#334155",
                    border: `1.5px solid ${active ? "#2563eb" : disabled ? "#f1f5f9" : "#e2e8f0"}`,
                    boxShadow: active
                      ? "0 2px 6px rgba(37,99,235,0.3)"
                      : "none",
                  }}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 22px",
          borderTop: "1px solid #f1f5f9",
          background: "#f8fafc",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "#64748b",
            flex: 1,
          }}
        >
          {selectedDate && selectedTime ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#16a34a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ color: "#16a34a", fontWeight: 600 }}>
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()},{" "}
                {selectedDate.getFullYear()} · {selectedTime}
              </span>
            </>
          ) : (
            <span style={{ color: "#94a3b8" }}>
              {!selectedDate ? "Pick a date →" : "Now pick a time →"}
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!(selectedDate && selectedTime)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "11px 22px",
            borderRadius: 9,
            border: "none",
            fontSize: 13,
            fontWeight: 700,
            cursor: selectedDate && selectedTime ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
            background:
              selectedDate && selectedTime
                ? "linear-gradient(135deg,#2563eb,#4f46e5)"
                : "#e2e8f0",
            color: selectedDate && selectedTime ? "#fff" : "#94a3b8",
            boxShadow:
              selectedDate && selectedTime
                ? "0 3px 12px rgba(37,99,235,0.35)"
                : "none",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
          </svg>
          Confirm Appointment
        </button>
      </div>
    </div>
  );
}

// Booking styles
const bs: Record<string, React.CSSProperties> = {
  wrapper: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
    fontFamily: "inherit",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #f1f5f9",
    background: "linear-gradient(135deg,#f8fafc,#f0f7ff)",
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    background: "linear-gradient(135deg,#2563eb,#4f46e5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  xBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 6,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { display: "grid", gridTemplateColumns: "1fr 210px", gap: 0 },
  calPanel: { padding: "20px 22px 18px", borderRight: "1px solid #f1f5f9" },
  timesPanel: { padding: "20px 18px", background: "#fafbfc" },
  navBtn: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 7,
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#475569",
  },
  closeBtn: {
    background: "linear-gradient(135deg,#2563eb,#4f46e5)",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    padding: "10px 22px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm Immi, your US immigration assistant. I can help you with questions about visas, green cards, citizenship, and other immigration matters. How can I assist you today?",
    },
  ]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [bookingIndex, setBookingIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, bookingIndex]);

  // Update the consultPrompt state of a specific message
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

    // Booking intent — skip API
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

    // Normal API flow
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
        "https://8ufqzsm271.execute-api.us-east-2.amazonaws.com/dev/api/ai-chatbot-immi",
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
          // Mid-stream tick: show partial text with typing cursor
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
          // Typing complete: one final update that enables the prompt
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
          content: `✅ Your appointment has been requested for **${formatted} at ${time}**. You'll receive a confirmation once our team reviews your slot. Is there anything else I can help you with?`,
        },
      ]);
    }, 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Immi</h1>
              <p className="text-sm text-gray-600">US Immigration Assistant</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {messages.map((message, index) => (
            <div key={index}>
              <div
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
                      : "bg-white text-gray-800 shadow-sm border border-gray-200"
                  }`}
                >
                  {message.role === "user" ? (
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.content}
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:mt-4 prose-headings:mb-2 prose-p:text-gray-800 prose-p:leading-relaxed prose-p:my-2 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:list-disc prose-ul:pl-4 prose-ul:my-3 prose-ol:list-decimal prose-ol:pl-4 prose-ol:my-3 prose-li:text-gray-800 prose-li:my-1.5 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                      {message.isTyping && (
                        <span className="inline-block h-4 w-1 animate-pulse bg-current ml-0.5" />
                      )}
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-600 to-gray-800">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>

              {/* ── Consultation prompt — shown after every API response ── */}
              {message.role === "assistant" &&
                message.isApiResponse === true &&
                message.consultPrompt !== undefined && (
                  <div className="ml-11 mt-1">
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

              {/* ── Booking widget — opens when user clicks Yes on this message ── */}
              {message.role === "assistant" &&
                (message.showBooking ||
                  (message.isApiResponse && message.consultPrompt === "yes")) &&
                bookingIndex === index && (
                  <div className="mt-3 ml-11">
                    <AppointmentBooking
                      onConfirm={handleBookingConfirm}
                      onClose={() => {
                        setBookingIndex(null);
                        if (message.isApiResponse) {
                          setConsultPromptState(index, "no");
                        }
                      }}
                    />
                  </div>
                )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-4 shadow-lg">
        <div className="mx-auto max-w-4xl">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me about US immigration… or type 'book an appointment'"
              className="flex-1 resize-none rounded-xl border text-gray-500 border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
              style={{ minHeight: "48px", maxHeight: "120px" }}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white transition-all hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-gray-500">
            Immi provides general information. For legal advice, consult an
            immigration attorney.
          </p>
        </div>
      </div>
    </div>
  );
}
