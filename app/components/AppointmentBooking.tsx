import React, { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import apiClient from "../services/axios";

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
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slot {
  id: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  durationMin: number;
  status: string;
  expertId: string;
  bookedBy: null | object;
}

interface AppointmentBookingProps {
  onConfirm: (date: Date, time: string) => void;
  onClose: () => void;
  conversationHistory?: { role: string; content: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

function parseDate(dateStr: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

// ─── Responsive hook ──────────────────────────────────────────────────────────

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const bs: Record<string, React.CSSProperties> = {
  wrapper: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
    width: "100%",
    maxWidth: 860,
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "1px solid #f1f5f9",
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
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
    flexShrink: 0,
  },
  navBtn: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 7,
    cursor: "pointer",
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    flexShrink: 0,
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1.5px solid #e2e8f0",
    fontSize: 14,
    fontFamily: "inherit",
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: 4,
    display: "block",
  },
  closeBtn: {
    padding: "10px 24px",
    borderRadius: 9,
    border: "none",
    background: "linear-gradient(135deg,#C41E1E,#8B0000)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppointmentBooking({
  onConfirm,
  onClose,
  conversationHistory = [],
}: AppointmentBookingProps) {
  const isMobile = useIsMobile(640);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  // Pre-select today so that slots fetched async immediately render for today's date
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    new Date(today),
  );
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");

  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // On mobile, track which step the user is on: "calendar" | "times"
  const [mobileStep, setMobileStep] = useState<"calendar" | "times">(
    "calendar",
  );

  useEffect(() => {
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const res = await apiClient.post<{ total: number; slots: Slot[] }>(
          "/immi-mangage-appointments",
          { action: "list", status: "available" },
        );
        setAllSlots(res.data.slots ?? []);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const axiosError = err as AxiosError<ApiErrorResponse>;
          setSlotsError(
            axiosError.response?.data?.error ??
              "Failed to load available slots.",
          );
        } else if (err instanceof Error) {
          setSlotsError(err.message);
        } else {
          setSlotsError("Failed to load available slots.");
        }
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, []);

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

  const hasSlots = (day: number): boolean => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return allSlots.some((s) => s.date === dateStr);
  };

  const selectDay = (day: number) => {
    if (isPast(day)) return;
    setSelectedDate(new Date(viewYear, viewMonth, day));
    setSelectedSlot(null);
    setBookingError(null);
    // On mobile, advance to the times step after picking a date
    if (isMobile) setMobileStep("times");
  };

  const slotsForDate: Slot[] = selectedDate
    ? allSlots
        .filter((s) => {
          const d = parseDate(s.date);
          return (
            d.getFullYear() === selectedDate.getFullYear() &&
            d.getMonth() === selectedDate.getMonth() &&
            d.getDate() === selectedDate.getDate()
          );
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    : [];

  const validate = (): boolean => {
    let ok = true;
    if (!name.trim()) {
      setNameError("Full name is required.");
      ok = false;
    } else setNameError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError("Email address is required.");
      ok = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Enter a valid email address.");
      ok = false;
    } else setEmailError("");
    return ok;
  };

  interface ApiErrorResponse {
    error: string;
  }

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot) return;
    if (!validate()) return;
    setBookingLoading(true);
    setBookingError(null);
    try {
      await apiClient.post("/immi-mangage-appointments", {
        action: "book",
        slotId: selectedSlot.id,
        bookedBy: { name: name.trim(), email: email.trim() },
        messages: conversationHistory.map((m) => ({
          role: m.role,
          text: m.content,
        })),
      });
      setSubmitted(true);
      onConfirm(selectedDate, formatTime(selectedSlot.startTime));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const axiosError = err as AxiosError<ApiErrorResponse>;
        setBookingError(
          axiosError.response?.data?.error ??
            "Booking failed. Please try again.",
        );
      } else if (err instanceof Error) {
        setBookingError(err.message);
      } else {
        setBookingError("Booking failed. Please try again.");
      }
    } finally {
      setBookingLoading(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (submitted && selectedDate && selectedSlot) {
    return (
      <div style={bs.wrapper}>
        <div
          style={{
            padding: isMobile ? "36px 20px" : "48px 32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
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
            {selectedDate.getFullYear()} · {formatTime(selectedSlot.startTime)}
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
            Hi <strong>{name}</strong>, a confirmation will be sent to{" "}
            <strong>{email}</strong>. A consultant will confirm your slot within
            1–2 business days.
          </p>
          <button onClick={onClose} style={bs.closeBtn}>
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  const canSubmit = !!(
    selectedDate &&
    selectedSlot &&
    name.trim() &&
    email.trim()
  );

  // ── Calendar panel ────────────────────────────────────────────────────────
  const CalendarPanel = (
    <div
      style={{
        flex: isMobile ? undefined : "0 0 auto",
        width: isMobile ? "100%" : 380,
        padding: isMobile ? "16px" : "20px 22px",
        borderRight: isMobile ? "none" : "1px solid #f1f5f9",
        borderBottom: isMobile ? "1px solid #f1f5f9" : "none",
      }}
    >
      {/* Month nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
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
              fontSize: 10,
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

      {/* Day grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          gap: isMobile ? 2 : 3,
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
          const hasDot = !past && hasSlots(day) && !sel;
          return (
            <button
              key={day}
              onClick={() => selectDay(day)}
              onMouseEnter={() => !past && setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              disabled={past}
              style={{
                position: "relative",
                aspectRatio: "1",
                border: "none",
                borderRadius: 8,
                fontSize: isMobile ? 12 : 13,
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
                flexDirection: "column",
                gap: 1,
                // Larger tap targets on mobile
                minHeight: isMobile ? 38 : undefined,
              }}
            >
              {day}
              {hasDot && (
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "#22c55e",
                    position: "absolute",
                    bottom: isMobile ? 3 : 4,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: isMobile ? 10 : 14,
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid #f1f5f9",
          flexWrap: "wrap",
        }}
      >
        {[
          { color: "#1d4ed8", bg: "#dbeafe", label: "Today" },
          { color: "#fff", bg: "#2563eb", label: "Selected" },
          { color: "#cbd5e1", bg: "transparent", label: "Unavailable" },
          { color: "#22c55e", bg: "#22c55e", label: "Has slots", dot: true },
        ].map((l) => (
          <span
            key={l.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 10,
              color: "#94a3b8",
            }}
          >
            <span
              style={{
                width: l.dot ? 6 : 8,
                height: l.dot ? 6 : 8,
                borderRadius: "50%",
                background: l.bg,
                border: l.dot ? "none" : `1px solid ${l.color}`,
                display: "inline-block",
              }}
            />
            {l.label}
          </span>
        ))}
      </div>

      {slotsError && (
        <p
          style={{
            fontSize: 12,
            color: "#ef4444",
            marginTop: 10,
            textAlign: "center",
          }}
        >
          {slotsError}
        </p>
      )}
    </div>
  );

  // ── Times panel ───────────────────────────────────────────────────────────
  const TimesPanel = (
    <div
      style={{
        flex: 1,
        padding: isMobile ? "16px" : "20px 22px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Mobile: back button */}
      {isMobile && (
        <button
          onClick={() => {
            setMobileStep("calendar");
            setSelectedSlot(null);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            color: "#2563eb",
            fontWeight: 600,
            padding: "0 0 12px",
            fontFamily: "inherit",
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
            strokeLinejoin="round"
          >
            <polyline points="10,3 5,8 10,13" />
          </svg>
          Back to calendar
        </button>
      )}

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
        {slotsLoading
          ? "Loading slots…"
          : slotsForDate.length > 0
            ? `${slotsForDate.length} slot${slotsForDate.length > 1 ? "s" : ""} available`
            : selectedDate
              ? "No slots available"
              : "Available · 1 hr each"}
      </p>

      {/* Time slot grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "1fr 1fr",
          gap: 6,
          marginBottom: 18,
        }}
      >
        {/* While fetching, show skeleton slot buttons */}
        {slotsLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <button
              key={"sk" + i}
              disabled
              style={{
                padding: isMobile ? "10px 4px" : "9px 6px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                cursor: "not-allowed",
                fontFamily: "inherit",
                textAlign: "center",
                background: "#f1f5f9",
                color: "#cbd5e1",
                border: "1.5px solid #f1f5f9",
              }}
            >
              ——
            </button>
          ))}
        {/* No slots message — only shown after fetch completes */}
        {!slotsLoading && selectedDate && slotsForDate.length === 0 && (
          <p
            style={{
              gridColumn: "1/-1",
              fontSize: 13,
              color: "#94a3b8",
              margin: 0,
            }}
          >
            No available slots for this date. Try another day.
          </p>
        )}
        {/* Actual slot buttons */}
        {!slotsLoading &&
          slotsForDate.map((slot) => {
            const active = selectedSlot?.id === slot.id;
            return (
              <button
                key={slot.id}
                onClick={() => {
                  setSelectedSlot(slot);
                  setBookingError(null);
                }}
                style={{
                  padding: isMobile ? "10px 4px" : "9px 6px",
                  borderRadius: 8,
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.12s",
                  fontFamily: "inherit",
                  textAlign: "center",
                  background: active ? "#2563eb" : "#fff",
                  color: active ? "#fff" : "#334155",
                  border: `1.5px solid ${active ? "#2563eb" : "#e2e8f0"}`,
                  boxShadow: active ? "0 2px 6px rgba(37,99,235,0.3)" : "none",
                }}
              >
                {formatTime(slot.startTime)}
              </button>
            );
          })}
      </div>

      {/* User info fields */}
      {selectedSlot && (
        <div
          style={{
            borderTop: "1px solid #f1f5f9",
            paddingTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#334155",
              margin: 0,
            }}
          >
            Your Details
          </p>
          <div>
            <label style={bs.label}>Full Name</label>
            <input
              type="text"
              placeholder="e.g. John Wick"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError("");
              }}
              style={{ ...bs.input, ...(nameError ? bs.inputError : {}) }}
            />
            {nameError && (
              <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>
                {nameError}
              </p>
            )}
          </div>
          <div>
            <label style={bs.label}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              style={{ ...bs.input, ...(emailError ? bs.inputError : {}) }}
            />
            {emailError && (
              <p style={{ fontSize: 11, color: "#ef4444", margin: "4px 0 0" }}>
                {emailError}
              </p>
            )}
          </div>
          {bookingError && (
            <p
              style={{
                fontSize: 12,
                color: "#ef4444",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 7,
                padding: "8px 12px",
                margin: 0,
              }}
            >
              {bookingError}
            </p>
          )}
        </div>
      )}
    </div>
  );

  // ── Main UI ──────────────────────────────────────────────────────────────
  return (
    <div style={bs.wrapper}>
      {/* Header */}
      <div style={bs.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                fontSize: isMobile ? 13 : 14,
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
              }}
            >
              Schedule a Consultation
            </p>
            <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
              {isMobile
                ? "Select a date & time"
                : "Select a date & time with an immigration expert"}
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

      {/* Mobile step indicator */}
      {isMobile && (
        <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
          {(["calendar", "times"] as const).map((step, idx) => (
            <div
              key={step}
              style={{
                flex: 1,
                padding: "8px 0",
                textAlign: "center",
                fontSize: 11,
                fontWeight: 600,
                color: mobileStep === step ? "#2563eb" : "#94a3b8",
                borderBottom: `2px solid ${mobileStep === step ? "#2563eb" : "transparent"}`,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                transition: "all 0.15s",
              }}
            >
              {idx + 1}. {step === "calendar" ? "Choose Date" : "Choose Time"}
            </div>
          ))}
        </div>
      )}

      {/* Body */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 0,
          minHeight: isMobile ? undefined : 380,
        }}
      >
        {/* On mobile, show only the active step */}
        {isMobile ? (
          mobileStep === "calendar" ? (
            CalendarPanel
          ) : (
            TimesPanel
          )
        ) : (
          <>
            {CalendarPanel}
            {TimesPanel}
          </>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          padding: isMobile ? "12px 16px" : "14px 22px",
          borderTop: "1px solid #f1f5f9",
          background: "#f8fafc",
          gap: 10,
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
          {selectedDate && selectedSlot ? (
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
              <span
                style={{
                  color: "#16a34a",
                  fontWeight: 600,
                  fontSize: isMobile ? 12 : 13,
                }}
              >
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()},{" "}
                {selectedDate.getFullYear()} ·{" "}
                {formatTime(selectedSlot.startTime)}
              </span>
            </>
          ) : (
            <span style={{ color: "#94a3b8", fontSize: isMobile ? 12 : 13 }}>
              {!selectedDate
                ? "Pick a date →"
                : !selectedSlot
                  ? "Now pick a time →"
                  : ""}
            </span>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || bookingLoading}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: isMobile ? "13px 16px" : "11px 22px",
            borderRadius: 9,
            border: "none",
            fontSize: 13,
            fontWeight: 700,
            cursor: canSubmit && !bookingLoading ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
            width: isMobile ? "100%" : "auto",
            background:
              canSubmit && !bookingLoading
                ? "linear-gradient(135deg,#C41E1E,#8B0000)"
                : "#e2e8f0",
            color: canSubmit && !bookingLoading ? "#fff" : "#94a3b8",
            boxShadow:
              canSubmit && !bookingLoading
                ? "0 3px 12px rgba(37,99,235,0.35)"
                : "none",
            opacity: bookingLoading ? 0.75 : 1,
          }}
        >
          {bookingLoading ? (
            <>
              <svg
                width="14"
                height="14"
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
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
              Booking…
            </>
          ) : (
            <>
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
            </>
          )}
        </button>
      </div>
    </div>
  );
}
