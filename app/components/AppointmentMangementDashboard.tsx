"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import apiClient from "../services/axios";
import { useRouter } from "next/navigation";
import router from "next/router";

// ─── Constants ────────────────────────────────────────────────────────────────

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
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "60 min", value: 60 },
  { label: "120 min", value: 120 },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function convertTo12Hour(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}
function parseDate(dateStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookedBy {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  citizenshipCountry: string;
  residenceCountry: string;
  language: "English" | "Spanish";
  VizExgrationGoal: string;
  timeSensitivity: "weeks" | "months" | "none";
  timelineDetail?: string;
}

interface Slot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  status: "available" | "booked";
  expertId: string | null;
  bookedBy: null | BookedBy;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiErrorResponse {
  error: string;
}

// ─── CSS-in-JS theme ──────────────────────────────────────────────────────────

const C = {
  bg: "#0a0a0f",
  surface: "#12121a",
  surfaceEl: "#1a1a26",
  border: "#252535",
  borderHov: "#3a3a55",
  accent: "#8B0000",
  accentBr: "#C41E1E",
  accentGlow: "rgba(139,0,0,0.35)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.12)",
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.12)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.12)",
  text: "#e8e8f0",
  textMid: "#9090b0",
  textDim: "#505070",
  white: "#ffffff",
};

const font = "'DM Mono', 'Fira Mono', 'Courier New', monospace";
const fontSans = "'DM Sans', 'Segoe UI', system-ui, sans-serif";

// ─── Shared micro-components ──────────────────────────────────────────────────

function Badge({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: font,
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        background:
          color === "green"
            ? C.greenDim
            : color === "red"
              ? C.redDim
              : C.amberDim,
        color: color === "green" ? C.green : color === "red" ? C.red : C.amber,
        border: `1px solid ${color === "green" ? "rgba(34,197,94,0.25)" : color === "red" ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "currentColor",
        }}
      />
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.7s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${C.accent}, ${C.accentBr})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 0 16px ${C.accentGlow}`,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: C.text,
            fontFamily: fontSans,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 11,
              color: C.textMid,
              fontFamily: font,
              marginTop: 1,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 1. STATS STRIP ───────────────────────────────────────────────────────────

function StatsStrip({ slots }: { slots: Slot[] }) {
  const total = slots.length;
  const booked = slots.filter((s) => s.status === "booked").length;
  const available = slots.filter((s) => s.status === "available").length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = slots.filter((s) => parseDate(s.date) >= today).length;

  const stats = [
    {
      label: "Total Slots",
      value: total,
      color: C.textMid,
      accent: C.borderHov,
    },
    {
      label: "Available",
      value: available,
      color: C.green,
      accent: "rgba(34,197,94,0.2)",
    },
    { label: "Booked", value: booked, color: C.accentBr, accent: C.accentGlow },
    {
      label: "Upcoming",
      value: upcoming,
      color: C.amber,
      accent: "rgba(245,158,11,0.2)",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,1fr)",
        gap: 12,
        marginBottom: 24,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: C.surface,
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            padding: "16px 18px",
            position: "relative" as const,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: s.accent,
            }}
          />
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: s.color,
              fontFamily: font,
              lineHeight: 1,
            }}
          >
            {String(s.value).padStart(2, "0")}
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.textDim,
              fontFamily: fontSans,
              marginTop: 6,
              textTransform: "uppercase" as const,
              letterSpacing: "0.07em",
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 2. SLOT CREATOR ──────────────────────────────────────────────────────────

function SlotCreator({ onCreated }: { onCreated: () => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [duration, setDuration] = useState(60);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [expertId, setExpertId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstDayOfMonth(year, month);

  const todayFlat = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const isPast = (d: number) => new Date(year, month, d) < todayFlat;
  const isSelected = (d: number) => selectedDay === d;
  const isToday = (d: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === d;

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
    setSelectedDay(null);
  };

  // Preview how many slots will be created
  function countSlots(): number {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const totalMin = eh * 60 + em - (sh * 60 + sm);
    if (totalMin <= 0) return 0;
    return Math.floor(totalMin / duration);
  }

  const slotCount = countSlots();
  const selectedDateStr =
    selectedDay !== null ? formatDate(year, month, selectedDay) : null;

  const handleCreate = async () => {
    if (!selectedDateStr) {
      setError("Please select a date.");
      return;
    }
    if (slotCount === 0) {
      setError("Invalid time range for selected duration.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.post("/immi-mangage-appointments", {
        action: "create",
        date: selectedDateStr,
        startTime,
        endTime,
        durationMin: duration,
        expertId: expertId.trim() || null,
      });
      setSuccess(`✓ ${(res.data as any).message}`);
      onCreated();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const e = err as AxiosError<ApiErrorResponse>;
        setError(e.response?.data?.error ?? "Failed to create slots.");
      } else setError("Failed to create slots.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "22px 24px 0" }}>
        <SectionHeader
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
          title="Create Appointment Slots"
          subtitle="Select date → duration → time range"
        />
      </div>

      <div style={{ display: "flex", gap: 0, flexWrap: "wrap" as const }}>
        {/* Calendar picker */}
        <div
          style={{
            flex: "0 0 auto",
            width: 300,
            padding: "0 24px 24px",
            borderRight: `1px solid ${C.border}`,
          }}
        >
          {/* Month nav */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <button onClick={prevMonth} style={navBtnStyle}>
              <svg
                width="12"
                height="12"
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
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: C.text,
                fontFamily: fontSans,
              }}
            >
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} style={navBtnStyle}>
              <svg
                width="12"
                height="12"
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
          {/* Day labels */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              marginBottom: 4,
            }}
          >
            {DAYS.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: C.textDim,
                  fontFamily: font,
                  letterSpacing: "0.06em",
                  padding: "3px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>
          {/* Day grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7,1fr)",
              gap: 2,
            }}
          >
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const past = isPast(day);
              const sel = isSelected(day);
              const tod = isToday(day);
              const hov = hoveredDay === day && !past && !sel;
              return (
                <button
                  key={day}
                  onClick={() => !past && setSelectedDay(day)}
                  onMouseEnter={() => !past && setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  disabled={past}
                  style={{
                    aspectRatio: "1",
                    border: "none",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: sel ? 800 : 500,
                    cursor: past ? "not-allowed" : "pointer",
                    fontFamily: fontSans,
                    transition: "all 0.1s",
                    background: sel
                      ? `linear-gradient(135deg,${C.accent},${C.accentBr})`
                      : tod
                        ? "rgba(139,0,0,0.15)"
                        : hov
                          ? C.surfaceEl
                          : "transparent",
                    color: sel
                      ? C.white
                      : tod
                        ? C.accentBr
                        : past
                          ? C.textDim
                          : C.text,
                    boxShadow: sel ? `0 2px 10px ${C.accentGlow}` : "none",
                    outline: tod && !sel ? `1px solid ${C.accent}` : "none",
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings panel */}
        <div style={{ flex: 1, padding: "0 24px 24px", minWidth: 260 }}>
          {/* Duration */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Slot Duration</label>
            <div style={{ display: "flex", gap: 8 }}>
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDuration(opt.value)}
                  style={{
                    flex: 1,
                    padding: "9px 4px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: duration === opt.value ? 800 : 500,
                    fontFamily: font,
                    cursor: "pointer",
                    transition: "all 0.12s",
                    background:
                      duration === opt.value
                        ? `linear-gradient(135deg,${C.accent},${C.accentBr})`
                        : C.surfaceEl,
                    color: duration === opt.value ? C.white : C.textMid,
                    border: `1px solid ${duration === opt.value ? C.accentBr : C.border}`,
                    boxShadow:
                      duration === opt.value
                        ? `0 2px 10px ${C.accentGlow}`
                        : "none",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div>
              <label style={labelStyle}>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={timeInputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={timeInputStyle}
              />
            </div>
          </div>

          {/* Expert ID */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Expert ID <span style={{ color: C.textDim }}>(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. expert_001"
              value={expertId}
              onChange={(e) => setExpertId(e.target.value)}
              style={{
                ...timeInputStyle,
                width: "100%",
                boxSizing: "border-box" as const,
              }}
            />
          </div>

          {/* Preview */}
          <div
            style={{
              background: C.surfaceEl,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              padding: "12px 16px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: C.textDim,
                  fontFamily: font,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                }}
              >
                Preview
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: C.text,
                  fontFamily: fontSans,
                  marginTop: 3,
                }}
              >
                {selectedDateStr ? (
                  `${MONTHS_SHORT[month]} ${selectedDay}, ${year}`
                ) : (
                  <span style={{ color: C.textDim }}>No date selected</span>
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" as const }}>
              <div
                style={{
                  fontSize: 11,
                  color: C.textDim,
                  fontFamily: font,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.07em",
                }}
              >
                Slots to create
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: slotCount > 0 ? C.green : C.textDim,
                  fontFamily: font,
                  lineHeight: 1,
                  marginTop: 2,
                }}
              >
                {String(slotCount).padStart(2, "0")}
              </div>
            </div>
          </div>

          {error && (
            <p
              style={{
                fontSize: 12,
                color: C.red,
                margin: "0 0 12px",
                fontFamily: fontSans,
              }}
            >
              {error}
            </p>
          )}
          {success && (
            <p
              style={{
                fontSize: 12,
                color: C.green,
                margin: "0 0 12px",
                fontFamily: fontSans,
              }}
            >
              {success}
            </p>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !selectedDateStr || slotCount === 0}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              border: "none",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: fontSans,
              cursor:
                !loading && selectedDateStr && slotCount > 0
                  ? "pointer"
                  : "not-allowed",
              background:
                !loading && selectedDateStr && slotCount > 0
                  ? `linear-gradient(135deg,${C.accent},${C.accentBr})`
                  : C.surfaceEl,
              color:
                !loading && selectedDateStr && slotCount > 0
                  ? C.white
                  : C.textDim,
              boxShadow:
                !loading && selectedDateStr && slotCount > 0
                  ? `0 4px 16px ${C.accentGlow}`
                  : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s",
            }}
          >
            {loading ? (
              <>
                <Spinner /> Creating…
              </>
            ) : (
              `Create ${slotCount > 0 ? slotCount : ""} Slot${slotCount !== 1 ? "s" : ""}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 3. DAY DETAIL MODAL ─────────────────────────────────────────────────────

function DayModal({
  date,
  slots,
  onClose,
  onRefresh,
}: {
  date: string;
  slots: Slot[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCancel = async (slotId: string) => {
    setCancellingId(slotId);
    try {
      await apiClient.post("/immi-mangage-appointments", {
        action: "cancel",
        slotId,
      });
      onRefresh();
    } catch {
    } finally {
      setCancellingId(null);
    }
  };

  const handleDelete = async (slotId: string) => {
    if (!window.confirm("Delete this slot permanently?")) return;
    setDeletingId(slotId);
    try {
      await apiClient.post("/immi-mangage-appointments", {
        action: "delete",
        slotId,
      });
      onRefresh();
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  const d = new Date(date + "T00:00:00");
  const dateLabel = `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const bookedCount = slots.filter((s) => s.status === "booked").length;
  const availCount = slots.filter((s) => s.status === "available").length;

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fadeIn 0.15s ease",
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .day-modal-scroll::-webkit-scrollbar { width: 4px; }
        .day-modal-scroll::-webkit-scrollbar-track { background: transparent; }
        .day-modal-scroll::-webkit-scrollbar-thumb { background: #3a3a55; border-radius: 4px; }
        .day-modal-scroll::-webkit-scrollbar-thumb:hover { background: #C41E1E; }
      `}</style>
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.borderHov}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 520,
          boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px ${C.accentGlow}`,
          animation: "slideUp 0.18s ease",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  background: `linear-gradient(135deg,${C.accent},${C.accentBr})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 12px ${C.accentGlow}`,
                }}
              >
                <svg
                  width="15"
                  height="15"
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
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: C.text,
                  fontFamily: fontSans,
                }}
              >
                {dateLabel}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Badge color="green">{availCount} available</Badge>
              <Badge color="red">{bookedCount} booked</Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: C.surfaceEl,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.textMid,
              flexShrink: 0,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="2" y1="2" x2="14" y2="14" />
              <line x1="14" y1="2" x2="2" y2="14" />
            </svg>
          </button>
        </div>

        {/* Slot list */}
        <div
          className="day-modal-scroll"
          style={{ overflowY: "auto", flex: 1, padding: "12px 24px 20px" }}
        >
          {slots.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: C.textDim,
                fontSize: 13,
                fontFamily: fontSans,
              }}
            >
              No slots for this day.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {slots.map((slot) => {
                const isBooked = slot.status === "booked";
                return (
                  <div
                    key={slot.id}
                    style={{
                      background: C.surfaceEl,
                      border: `1px solid ${isBooked ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.15)"}`,
                      borderRadius: 10,
                      padding: "14px 16px",
                      borderLeft: `3px solid ${isBooked ? C.red : C.green}`,
                    }}
                  >
                    {/* Top row: time + badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: isBooked && slot.bookedBy ? 12 : 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: C.text,
                            fontFamily: font,
                          }}
                        >
                          {convertTo12Hour(slot.startTime)}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: C.textDim,
                            fontFamily: font,
                          }}
                        >
                          →
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.textMid,
                            fontFamily: font,
                          }}
                        >
                          {convertTo12Hour(slot.endTime)}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: C.textDim,
                            fontFamily: font,
                          }}
                        >
                          ({slot.durationMin} min)
                        </span>
                      </div>
                      <Badge color={isBooked ? "red" : "green"}>
                        {isBooked ? "Booked" : "Available"}
                      </Badge>
                    </div>

                    {/* Booking details */}
                    {isBooked && slot.bookedBy && (
                      <div
                        style={{
                          paddingTop: 10,
                          borderTop: `1px solid ${C.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: C.text,
                              fontFamily: fontSans,
                              marginBottom: 2,
                            }}
                          >
                            {slot.bookedBy.firstName +
                              " " +
                              slot.bookedBy.lastName || "—"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: C.textMid,
                              fontFamily: font,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {slot.bookedBy.email}
                          </div>
                          {slot.updatedAt && (
                            <div
                              style={{
                                fontSize: 10,
                                color: C.textDim,
                                fontFamily: font,
                                marginTop: 3,
                              }}
                            >
                              Booked{" "}
                              {new Date(slot.updatedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        {/* Actions */}
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => handleCancel(slot.id)}
                            disabled={cancellingId === slot.id}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 7,
                              border: `1px solid ${C.border}`,
                              background: C.surfaceEl,
                              color: C.amber,
                              cursor: "pointer",
                              fontSize: 10,
                              fontWeight: 700,
                              fontFamily: fontSans,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              opacity: cancellingId === slot.id ? 0.6 : 1,
                            }}
                          >
                            {cancellingId === slot.id ? <Spinner /> : null}
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(slot.id)}
                            disabled={deletingId === slot.id}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 7,
                              border: "1px solid rgba(239,68,68,0.25)",
                              background: C.redDim,
                              color: C.red,
                              cursor: "pointer",
                              fontSize: 10,
                              fontWeight: 700,
                              fontFamily: fontSans,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              opacity: deletingId === slot.id ? 0.6 : 1,
                            }}
                          >
                            {deletingId === slot.id ? <Spinner /> : null}
                            Delete
                          </button>
                          <button
                            onClick={() =>
                              router.push(
                                `/expert/userQuery/appointment/details/${slot.id}`,
                              )
                            }
                            disabled={deletingId === slot.id}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 7,
                              border: `1px solid ${C.green}`,
                              background: C.greenDim,
                              color: C.green,
                              cursor: "pointer",
                              fontSize: 10,
                              fontWeight: 700,
                              fontFamily: fontSans,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              opacity: deletingId === slot.id ? 0.6 : 1,
                            }}
                          >
                            {deletingId === slot.id ? <Spinner /> : null}
                            View
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Available slot action */}
                    {!isBooked && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: `1px solid ${C.border}`,
                        }}
                      >
                        <button
                          onClick={() => handleDelete(slot.id)}
                          disabled={deletingId === slot.id}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 7,
                            border: "1px solid rgba(239,68,68,0.25)",
                            background: C.redDim,
                            color: C.red,
                            cursor: "pointer",
                            fontSize: 10,
                            fontWeight: 700,
                            fontFamily: fontSans,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            opacity: deletingId === slot.id ? 0.6 : 1,
                          }}
                        >
                          {deletingId === slot.id ? <Spinner /> : null}
                          Delete Slot
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 4. CALENDAR OVERVIEW ─────────────────────────────────────────────────────

function CalendarOverview({
  slots,
  onRefresh,
}: {
  slots: Slot[];
  onRefresh: () => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

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

  const slotsInMonth = slots.filter((s) => {
    const d = parseDate(s.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  const slotsForDay = (day: number): Slot[] =>
    slotsInMonth
      .filter((s) => parseDate(s.date).getDate() === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  // Summary row beneath calendar
  const booked = slotsInMonth.filter((s) => s.status === "booked");
  const available = slotsInMonth.filter((s) => s.status === "available");

  const handleCancel = async (slotId: string) => {
    setCancellingId(slotId);
    try {
      await apiClient.post("/immi-mangage-appointments", {
        action: "cancel",
        slotId,
      });
      onRefresh();
    } catch {
    } finally {
      setCancellingId(null);
    }
  };

  const handleDelete = async (slotId: string) => {
    if (!window.confirm("Delete this slot permanently?")) return;
    setDeletingId(slotId);
    try {
      await apiClient.post("/immi-mangage-appointments", {
        action: "delete",
        slotId,
      });
      onRefresh();
    } catch {
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      style={{
        background: C.surface,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "22px 24px 0" }}>
        <SectionHeader
          icon={
            <svg
              width="18"
              height="18"
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
          }
          title="Appointment Calendar"
          subtitle="Click any day to see all slot details"
        />

        {/* Month nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <button onClick={prevMonth} style={navBtnStyle}>
            <svg
              width="13"
              height="13"
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
          <div style={{ textAlign: "center" as const }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: C.text,
                fontFamily: fontSans,
              }}
            >
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <div
              style={{
                fontSize: 11,
                color: C.textDim,
                fontFamily: font,
                marginTop: 2,
              }}
            >
              {slotsInMonth.length} slot{slotsInMonth.length !== 1 ? "s" : ""} ·{" "}
              {booked.length} booked · {available.length} available
            </div>
          </div>
          <button onClick={nextMonth} style={navBtnStyle}>
            <svg
              width="13"
              height="13"
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
      </div>

      <div style={{ padding: "0 16px 24px" }}>
        {/* Day labels */}
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
                fontSize: 9,
                fontWeight: 700,
                color: C.textDim,
                fontFamily: font,
                letterSpacing: "0.07em",
                padding: "4px 0",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7,1fr)",
            gap: 4,
          }}
        >
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const daySlots = slotsForDay(day);
            const hasBooked = daySlots.some((s) => s.status === "booked");
            const hasAvail = daySlots.some((s) => s.status === "available");
            const tod = isToday(day);

            const dateStr = formatDate(viewYear, viewMonth, day);
            const hasSlots = daySlots.length > 0;
            return (
              <div
                key={day}
                onClick={() => hasSlots && setSelectedDayStr(dateStr)}
                style={{
                  minHeight: 80,
                  background: tod ? "rgba(139,0,0,0.08)" : C.surfaceEl,
                  borderRadius: 8,
                  border: `1px solid ${tod ? C.accent : C.border}`,
                  padding: "6px 5px",
                  display: "flex",
                  flexDirection: "column" as const,
                  overflow: "hidden",
                  cursor: hasSlots ? "pointer" : "default",
                  transition: "border-color 0.12s, background 0.12s",
                }}
                onMouseEnter={(e) => {
                  if (hasSlots)
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      C.borderHov;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = tod
                    ? C.accent
                    : C.border;
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: tod ? 800 : 600,
                    color: tod ? C.accentBr : C.textMid,
                    fontFamily: font,
                    marginBottom: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {day}
                  {daySlots.length > 0 && (
                    <div style={{ display: "flex", gap: 2 }}>
                      {hasAvail && (
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: C.green,
                          }}
                        />
                      )}
                      {hasBooked && (
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: C.accentBr,
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Slot pills */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column" as const,
                    gap: 2,
                    flex: 1,
                    overflow: "hidden",
                  }}
                >
                  {daySlots.slice(0, 3).map((slot) => {
                    const isBooked = slot.status === "booked";
                    return (
                      <div
                        key={slot.id}
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          fontFamily: font,
                          padding: "2px 4px",
                          borderRadius: 4,
                          background: isBooked ? C.redDim : C.greenDim,
                          color: isBooked ? C.red : C.green,
                          border: `1px solid ${isBooked ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
                          whiteSpace: "nowrap" as const,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {convertTo12Hour(slot.startTime)}
                        {isBooked && slot.bookedBy?.firstName?.trim()
                          ? ` · ${slot.bookedBy.firstName}`
                          : ""}
                      </div>
                    );
                  })}
                  {daySlots.length > 3 && (
                    <div
                      style={{
                        fontSize: 9,
                        color: C.textDim,
                        fontFamily: font,
                        paddingLeft: 4,
                      }}
                    >
                      +{daySlots.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDayStr && (
        <DayModal
          date={selectedDayStr}
          slots={slotsForDay(new Date(selectedDayStr + "T00:00:00").getDate())}
          onClose={() => setSelectedDayStr(null)}
          onRefresh={() => {
            setSelectedDayStr(null);
            onRefresh();
          }}
        />
      )}

      {/* Booked appointments list */}
      {booked.length > 0 && (
        <div
          style={{ borderTop: `1px solid ${C.border}`, padding: "20px 24px" }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.textDim,
              fontFamily: font,
              textTransform: "uppercase" as const,
              letterSpacing: "0.07em",
              marginBottom: 12,
            }}
          >
            Booked This Month
          </div>
          <div
            className="my-3 cursor-pointer"
            onClick={() => router.push("userQuery")}
          >
            Click here to Get Booked Appointment Details
          </div>
          <div
            className="booked-list"
            style={{
              display: "flex",
              flexDirection: "column" as const,
              gap: 8,
              maxHeight: 360,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {booked.map((slot) => (
              <div
                key={slot.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: C.surfaceEl,
                  borderRadius: 10,
                  border: `1px solid ${C.border}`,
                  padding: "12px 16px",
                }}
              >
                {/* Date & time */}
                <div
                  style={{
                    flex: "0 0 auto",
                    textAlign: "center" as const,
                    minWidth: 50,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: C.accentBr,
                      fontFamily: font,
                      lineHeight: 1,
                    }}
                  >
                    {parseDate(slot.date).getDate()}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: C.textDim,
                      fontFamily: font,
                      textTransform: "uppercase" as const,
                    }}
                  >
                    {MONTHS_SHORT[parseDate(slot.date).getMonth()]}
                  </div>
                </div>
                <div
                  style={{
                    width: 1,
                    height: 36,
                    background: C.border,
                    flexShrink: 0,
                  }}
                />
                {/* Client info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: C.text,
                      fontFamily: fontSans,
                      marginBottom: 1,
                    }}
                  >
                    {slot.bookedBy?.firstName + " " + slot.bookedBy?.lastName ||
                      "—"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: C.textMid,
                      fontFamily: font,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    {slot.bookedBy?.email}
                  </div>
                </div>
                {/* Time */}
                <div style={{ textAlign: "right" as const, flex: "0 0 auto" }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.text,
                      fontFamily: font,
                    }}
                  >
                    {convertTo12Hour(slot.startTime)}
                  </div>
                  <div
                    style={{ fontSize: 10, color: C.textDim, fontFamily: font }}
                  >
                    {slot.durationMin} min
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleCancel(slot.id)}
                    disabled={cancellingId === slot.id}
                    title="Cancel booking (make available)"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 7,
                      border: `1px solid ${C.border}`,
                      background: C.surfaceEl,
                      color: C.amber,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: fontSans,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      opacity: cancellingId === slot.id ? 0.6 : 1,
                    }}
                  >
                    {cancellingId === slot.id ? <Spinner /> : null}
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(slot.id)}
                    disabled={deletingId === slot.id}
                    title="Delete slot permanently"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 7,
                      border: `1px solid rgba(239,68,68,0.25)`,
                      background: C.redDim,
                      color: C.red,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: fontSans,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      opacity: deletingId === slot.id ? 0.6 : 1,
                    }}
                  >
                    {deletingId === slot.id ? <Spinner /> : null}
                    Delete
                  </button>
                  <button
                    onClick={() =>
                      router.push(
                        `/expert/userQuery/appointment/details/${slot.id}`,
                      )
                    }
                    title="Delete slot permanently"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 7,
                      border: `1px solid ${C.green}`,
                      background: C.greenDim,
                      color: C.green,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: fontSans,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      opacity: deletingId === slot.id ? 0.6 : 1,
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared style atoms ───────────────────────────────────────────────────────

const navBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 7,
  background: C.surfaceEl,
  border: `1px solid ${C.border}`,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: C.textMid,
  flexShrink: 0,
  transition: "all 0.1s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  fontFamily: font,
  color: C.textDim,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: 6,
};

const timeInputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  background: C.surfaceEl,
  color: C.text,
  fontSize: 13,
  fontFamily: font,
  outline: "none",
  colorScheme: "dark" as any,
};

// ─── ROOT: Admin Dashboard ────────────────────────────────────────────────────

export default function AdminAppointmentDashboard() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookedRes, availableRes] = await Promise.all([
        apiClient.post<{ total: number; slots: Slot[] }>(
          "VizEx-mangage-appointments",
          { action: "list", status: "booked" },
        ),
        apiClient.post<{ total: number; slots: Slot[] }>(
          "VizEx-mangage-appointments",
          { action: "list", status: "available" },
        ),
      ]);
      setSlots([
        ...(bookedRes.data.slots ?? []),
        ...(availableRes.data.slots ?? []),
      ]);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const e = err as AxiosError<ApiErrorResponse>;
        setError(e.response?.data?.error ?? "Failed to load slots.");
      } else setError("Failed to load slots.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots, lastRefresh]);

  const refresh = () => setLastRefresh(Date.now());

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        fontFamily: fontSans,
        padding: "32px 24px",
      }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        .booked-list::-webkit-scrollbar { width: 4px; }
        .booked-list::-webkit-scrollbar-track { background: transparent; }
        .booked-list::-webkit-scrollbar-thumb { background: #3a3a55; border-radius: 4px; }
        .booked-list::-webkit-scrollbar-thumb:hover { background: #C41E1E; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: C.accentBr,
                  boxShadow: `0 0 12px ${C.accentGlow}`,
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: C.textDim,
                  fontFamily: font,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                Admin · Appointment Management
              </span>
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 800,
                color: C.text,
                fontFamily: fontSans,
                lineHeight: 1.1,
              }}
            >
              <span className="italic font-bold text-yellow-500">
                🤖 VizEx{" "}
              </span>{" "}
              Appointment Dashboard
            </h1>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 16px",
              borderRadius: 9,
              background: C.surfaceEl,
              border: `1px solid ${C.border}`,
              color: loading ? C.textDim : C.textMid,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: fontSans,
            }}
          >
            {loading ? (
              <Spinner />
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            )}
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div
            style={{
              background: C.redDim,
              border: `1px solid rgba(239,68,68,0.25)`,
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 13,
              color: C.red,
              fontFamily: fontSans,
            }}
          >
            {error}
          </div>
        )}

        <StatsStrip slots={slots} />

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SlotCreator onCreated={refresh} />
          <CalendarOverview slots={slots} onRefresh={refresh} />
        </div>
      </div>
    </div>
  );
}
