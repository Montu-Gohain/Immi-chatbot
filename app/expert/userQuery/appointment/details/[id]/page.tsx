"use client";
import apiClient from "@/app/services/axios";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  text: string;
  ts: string;
}

interface ConversationDetail {
  messages: Message[];
  bookedBy: { name: string; email: string };
  createdAt: string;
  updatedAt: string;
  totalMessages: number;
}

interface AppointmentDetail {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  expertId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  bookedBy: { name: string; email: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Simple markdown → styled React nodes renderer (bold, headers, bullet lists)
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      elements.push(
        <hr
          key={i}
          style={{
            border: "none",
            borderTop: "1px solid #e5e7eb",
            margin: "10px 0",
          }}
        />,
      );
      i++;
      continue;
    }

    // Headings
    const h3 = line.match(/^###\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h1 = line.match(/^#\s+(.*)/);
    if (h3) {
      elements.push(
        <p
          key={i}
          style={{
            margin: "12px 0 4px",
            fontWeight: 700,
            fontSize: 13,
            color: "#1a56db",
            letterSpacing: "0.03em",
          }}
        >
          {inlineMd(h3[1])}
        </p>,
      );
      i++;
      continue;
    }
    if (h2) {
      elements.push(
        <p
          key={i}
          style={{
            margin: "14px 0 4px",
            fontWeight: 700,
            fontSize: 14,
            color: "#111827",
          }}
        >
          {inlineMd(h2[1])}
        </p>,
      );
      i++;
      continue;
    }
    if (h1) {
      elements.push(
        <p
          key={i}
          style={{
            margin: "16px 0 6px",
            fontWeight: 700,
            fontSize: 15,
            color: "#111827",
          }}
        >
          {inlineMd(h1[1])}
        </p>,
      );
      i++;
      continue;
    }

    // Bullet list item
    if (/^\s*[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ margin: "6px 0", paddingLeft: 18 }}>
          {items.map((item, j) => (
            <li
              key={j}
              style={{
                fontSize: 13,
                color: "#374151",
                marginBottom: 3,
                lineHeight: 1.6,
              }}
            >
              {inlineMd(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list item
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ margin: "6px 0", paddingLeft: 20 }}>
          {items.map((item, j) => (
            <li
              key={j}
              style={{
                fontSize: 13,
                color: "#374151",
                marginBottom: 3,
                lineHeight: 1.6,
              }}
            >
              {inlineMd(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(
      <p
        key={i}
        style={{
          margin: "4px 0",
          fontSize: 13,
          color: "#374151",
          lineHeight: 1.65,
        }}
      >
        {inlineMd(line)}
      </p>,
    );
    i++;
  }

  return <>{elements}</>;
}

// Inline markdown: bold (**text**) and links [label](url)
function inlineMd(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.*)\*\*$/);
    if (bold)
      return (
        <strong key={i} style={{ fontWeight: 600, color: "#111827" }}>
          {bold[1]}
        </strong>
      );

    const link = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (link)
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#1a56db", textDecoration: "none" }}
        >
          {link[1]}
        </a>
      );

    return part;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 11,
          color: "#9ca3af",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
        {value}
      </span>
    </div>
  );
}

function UserBubble({ message }: { message: Message }) {
  return (
    <div
      style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}
    >
      <div style={{ maxWidth: "72%" }}>
        <p
          style={{
            margin: "0 0 4px",
            textAlign: "right",
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          User · {formatTime(message.ts)}
        </p>
        <div
          style={{
            background: "#1a56db",
            borderRadius: "16px 16px 4px 16px",
            padding: "10px 16px",
            color: "#fff",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({
  message,
  userName,
}: {
  message: Message;
  userName: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 12,
      }}
    >
      {/* Immi avatar */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          flexShrink: 0,
          background: "linear-gradient(135deg, #0e9f6e 0%, #1a56db 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.03em",
          marginTop: 2,
        }}
      >
        AI
      </div>
      <div style={{ maxWidth: "78%" }}>
        <p style={{ margin: "0 0 4px", fontSize: 11, color: "#9ca3af" }}>
          Immi · {formatTime(message.ts)}
        </p>
        <div
          style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "4px 16px 16px 16px",
            padding: "12px 16px",
          }}
        >
          {renderMarkdown(message.text)}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AppointmentDetailPage() {
  const params = useParams();
  const slotId = params.id as string;
  const router = useRouter();
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(
    null,
  );
  const [conversation, setConversation] = useState<ConversationDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slotId) return;
    (async () => {
      try {
        const res = await apiClient.post("/immi-appointment-details", {
          action: "getOne",
          slotId,
        });
        setAppointment(res.data.appointment);
        setConversation(res.data.conversation);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ?? "Failed to fetch appointment details",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [slotId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
          color: "#9ca3af",
          fontSize: 15,
          background: "#f9fafb",
        }}
      >
        Loading conversation…
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
          background: "#f9fafb",
          gap: 16,
        }}
      >
        <p style={{ color: "#991b1b", fontSize: 15 }}>
          {error ?? "Appointment not found."}
        </p>
        <button onClick={() => router.back()} style={backBtnStyle}>
          ← Go back
        </button>
      </div>
    );
  }

  // Skip the first assistant message (greeting) for the detail view too
  const messages = (conversation?.messages ?? []).filter(
    (m, idx) => !(m.role === "assistant" && idx === 0),
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f9fafb",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        padding: "40px 24px",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        {/* Back button */}
        <button onClick={() => router.back()} style={backBtnStyle}>
          ← All appointments
        </button>

        {/* Appointment meta card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 24,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          {/* Name row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1a56db 0%, #0e9f6e 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                flexShrink: 0,
              }}
            >
              {initials(appointment.bookedBy.name)}
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                {appointment.bookedBy.name}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                {appointment.bookedBy.email}
              </p>
            </div>
            <span
              style={{
                marginLeft: "auto",
                background: "#ecfdf5",
                color: "#065f46",
                padding: "3px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                textTransform: "capitalize",
              }}
            >
              {appointment.status}
            </span>
          </div>

          {/* Meta chips */}
          <div
            style={{
              display: "flex",
              gap: 32,
              flexWrap: "wrap",
              background: "#f9fafb",
              borderRadius: 10,
              padding: "14px 18px",
            }}
          >
            <MetaChip label="Date" value={formatDate(appointment.date)} />
            <MetaChip
              label="Time"
              value={`${appointment.startTime} – ${appointment.endTime}`}
            />
            <MetaChip
              label="Duration"
              value={`${appointment.durationMin} min`}
            />
            <MetaChip label="Expert ID" value={appointment.expertId} />
          </div>
        </div>

        {/* Conversation thread */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          {/* Thread header */}
          <div
            style={{
              padding: "16px 24px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#111827",
                }}
              >
                Conversation history
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>
                {conversation?.totalMessages ?? 0} messages total
                {conversation?.createdAt
                  ? ` · Started ${formatTime(conversation.createdAt)}`
                  : ""}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div style={{ padding: "24px 24px 16px" }}>
            {messages.length === 0 ? (
              <p
                style={{
                  color: "#9ca3af",
                  fontSize: 13,
                  textAlign: "center",
                  padding: "40px 0",
                }}
              >
                No messages in this conversation.
              </p>
            ) : (
              messages.map((msg, idx) =>
                msg.role === "user" ? (
                  <UserBubble key={idx} message={msg} />
                ) : (
                  <AssistantBubble
                    key={idx}
                    message={msg}
                    userName={appointment.bookedBy.name}
                  />
                ),
              )
            )}
          </div>

          {/* Thread footer */}
          {conversation?.updatedAt && (
            <div
              style={{
                padding: "12px 24px",
                borderTop: "1px solid #f3f4f6",
                fontSize: 12,
                color: "#9ca3af",
                textAlign: "right",
              }}
            >
              Last message at {formatTime(conversation.updatedAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const backBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#1a56db",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: "0 0 20px",
  fontFamily: "'DM Sans', sans-serif",
  letterSpacing: "0.01em",
};
