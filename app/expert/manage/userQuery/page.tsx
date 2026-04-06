"use client";
import apiClient from "@/app/services/axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  text: string;
  ts: string;
}

interface Conversation {
  messages: Message[];
  totalMessages: number;
  preview: string | null;
  createdAt: string;
}

interface Appointment {
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
  conversation: Conversation | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
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

// Strip markdown bold/headers for plain preview text
function stripMarkdown(text: string) {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  return (
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #1a56db 0%, #0e9f6e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 600,
        fontSize: 14,
        flexShrink: 0,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {initials(name)}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    booked: { bg: "#ecfdf5", color: "#065f46" },
    cancelled: { bg: "#fef2f2", color: "#991b1b" },
    pending: { bg: "#fffbeb", color: "#92400e" },
  };
  const c = colors[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.03em",
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

function ConversationPreview({
  conversation,
}: {
  conversation: Conversation | null;
}) {
  if (!conversation || !conversation.messages.length) {
    return (
      <p
        style={{
          color: "#9ca3af",
          fontSize: 13,
          margin: 0,
          fontStyle: "italic",
        }}
      >
        No conversation recorded
      </p>
    );
  }

  // Find the first user message and the first (non-greeting) assistant reply
  const userMsg = conversation.messages.find((m) => m.role === "user");
  const assistantMsg = conversation.messages.find(
    (m) => m.role === "assistant",
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {userMsg && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#1a56db",
              background: "#eff6ff",
              borderRadius: 4,
              padding: "2px 7px",
              flexShrink: 0,
              marginTop: 2,
              letterSpacing: "0.04em",
            }}
          >
            USER
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#374151",
              lineHeight: 1.5,
            }}
          >
            {userMsg.text}
          </p>
        </div>
      )}
      {assistantMsg && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#065f46",
              background: "#ecfdf5",
              borderRadius: 4,
              padding: "2px 7px",
              flexShrink: 0,
              marginTop: 2,
              letterSpacing: "0.04em",
            }}
          >
            IMMI
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#6b7280",
              lineHeight: 1.5,
            }}
          >
            {stripMarkdown(assistantMsg.text)}
          </p>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  onView,
}: {
  appointment: Appointment;
  onView: (id: string) => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.2s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)")
      }
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={appointment.bookedBy.name} />
          <div>
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: 15,
                color: "#111827",
              }}
            >
              {appointment.bookedBy.name}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
              {appointment.bookedBy.email}
            </p>
          </div>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Time row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          background: "#f9fafb",
          borderRadius: 10,
          padding: "10px 14px",
        }}
      >
        {[
          { label: "Date", value: formatDate(appointment.date) },
          {
            label: "Time",
            value: `${appointment.startTime} – ${appointment.endTime}`,
          },
          { label: "Duration", value: `${appointment.durationMin} min` },
        ].map(({ label, value }) => (
          <div key={label}>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "#9ca3af",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 14,
                fontWeight: 500,
                color: "#111827",
              }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Conversation preview */}
      <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14 }}>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 11,
            fontWeight: 700,
            color: "#9ca3af",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Conversation preview · {appointment.conversation?.totalMessages ?? 0}{" "}
          messages
        </p>
        <ConversationPreview conversation={appointment.conversation} />
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => onView(appointment.id)}
          style={{
            background: "#1a56db",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.02em",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#1648c0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1a56db")}
        >
          See full conversation →
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.post("/immi-appointment-details", {
          action: "getAll",
        });
        setAppointments(res.data.appointments);
        setTotal(res.data.total);
      } catch (err: any) {
        setError(err?.response?.data?.error ?? "Failed to fetch appointments");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

      {/* Page header */}
      <div style={{ maxWidth: 860, margin: "0 auto 32px" }}>
        <h1
          style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#111827" }}
        >
          Booked Appointments
        </h1>
        {!loading && !error && (
          <p style={{ margin: "6px 0 0", color: "#6b7280", fontSize: 14 }}>
            {total} appointment{total !== 1 ? "s" : ""} scheduled
          </p>
        )}
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 0",
              color: "#9ca3af",
              fontSize: 15,
            }}
          >
            Loading appointments…
          </div>
        )}

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: "16px 20px",
              color: "#991b1b",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && appointments.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 0",
              color: "#9ca3af",
              fontSize: 15,
            }}
          >
            No booked appointments found.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appointment={appt}
              onView={(id) =>
                router.push(`/expert/manage/appointment/details/${id}`)
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
