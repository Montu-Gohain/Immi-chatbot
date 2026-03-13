"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────
interface AppointmentBookingProps {
  onClose?: () => void;
  onConfirm?: (date: Date, time: string) => void;
}

// ── Constants ──────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ── Component ──────────────────────────────────────────────────────────
export default function AppointmentBooking({
  onClose,
  onConfirm,
}: AppointmentBookingProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Calendar logic
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

  const isPast = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d < today;
  };
  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear
    );
  };
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
    onConfirm?.(selectedDate, selectedTime);
  };

  const canSubmit = !!selectedDate && !!selectedTime;

  // ── Confirmed screen ────────────────────────────────────────────────
  if (submitted && selectedDate && selectedTime) {
    return (
      <div style={styles.wrapper}>
        <div style={styles.confirmedBox}>
          <div style={styles.checkCircle}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="16" fill="#1a6b4a" />
              <path
                d="M9 16.5l5 5 9-10"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 style={styles.confirmedTitle}>Appointment Requested</h3>
          <p style={styles.confirmedSub}>
            {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()},{" "}
            {selectedDate.getFullYear()} &nbsp;·&nbsp; {selectedTime}
          </p>
          <p style={styles.confirmedNote}>
            A confirmation will be sent once an immigration consultant reviews
            your request. Response time is typically 1–2 business days.
          </p>
          {onClose && (
            <button style={styles.closeBtn} onClick={onClose}>
              Back to Chat
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Main UI ─────────────────────────────────────────────────────────
  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
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
            <p style={styles.headerLabel}>Schedule a Consultation</p>
            <p style={styles.headerSub}>
              Select a date and time with an immigration expert
            </p>
          </div>
        </div>
        {onClose && (
          <button style={styles.xBtn} onClick={onClose} aria-label="Close">
            <svg
              width="16"
              height="16"
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
        )}
      </div>

      {/* Body: Calendar + Timeslots */}
      <div style={styles.body}>
        {/* ── LEFT: Calendar ── */}
        <div style={styles.calendarPanel}>
          {/* Month navigation */}
          <div style={styles.monthNav}>
            <button
              style={styles.navBtn}
              onClick={prevMonth}
              aria-label="Previous month"
            >
              <svg
                width="16"
                height="16"
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
            <span style={styles.monthLabel}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              style={styles.navBtn}
              onClick={nextMonth}
              aria-label="Next month"
            >
              <svg
                width="16"
                height="16"
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

          {/* Day headers */}
          <div style={styles.dayHeaders}>
            {DAYS.map((d) => (
              <div key={d} style={styles.dayHeader}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={styles.dayGrid}>
            {/* Empty cells for offset */}
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const past = isPast(day);
              const sel = isSelected(day);
              const todayDay = isToday(day);
              return (
                <button
                  key={day}
                  onClick={() => selectDay(day)}
                  disabled={past}
                  style={{
                    ...styles.dayCell,
                    ...(past ? styles.dayCellPast : {}),
                    ...(todayDay ? styles.dayCellToday : {}),
                    ...(sel ? styles.dayCellSelected : {}),
                    ...(!past && !sel ? styles.dayCellHoverable : {}),
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={styles.legend}>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: "#1a4f8a" }} />
              Today
            </span>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: "#1a6b4a" }} />
              Selected
            </span>
            <span style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: "#cbd5e1" }} />
              Unavailable
            </span>
          </div>
        </div>

        {/* ── RIGHT: Time Slots ── */}
        <div style={styles.timesPanel}>
          <p style={styles.timesLabel}>
            {selectedDate
              ? `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}`
              : "Select a date first"}
          </p>
          <p style={styles.timesSub}>Available slots · 1 hr each</p>
          <div style={styles.slotsGrid}>
            {TIME_SLOTS.map((slot) => {
              const active = selectedTime === slot;
              const disabled = !selectedDate;
              return (
                <button
                  key={slot}
                  disabled={disabled}
                  onClick={() => !disabled && setSelectedTime(slot)}
                  style={{
                    ...styles.slotBtn,
                    ...(disabled ? styles.slotDisabled : {}),
                    ...(active ? styles.slotActive : {}),
                    ...(!active && !disabled ? styles.slotAvailable : {}),
                  }}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BOTTOM: Submit ── */}
      <div style={styles.footer}>
        <div style={styles.selectionSummary}>
          {selectedDate && selectedTime ? (
            <>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1a6b4a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ color: "#1a6b4a", fontWeight: 600 }}>
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()},{" "}
                {selectedDate.getFullYear()} &nbsp;at&nbsp; {selectedTime}
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
          disabled={!canSubmit}
          style={{
            ...styles.submitBtn,
            ...(!canSubmit ? styles.submitDisabled : styles.submitActive),
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path
              d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07
              A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3
              a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91
              a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7
              A2 2 0 0122 14.92z"
            />
          </svg>
          Confirm Appointment
        </button>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
    marginTop: 16,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    maxWidth: 820,
  },

  // ── Header
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 24px",
    borderBottom: "1px solid #f1f5f9",
    background: "linear-gradient(135deg, #f8fafc 0%, #f0f7ff 100%)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: "#1a4f8a",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
    lineHeight: 1.3,
  },
  headerSub: {
    fontSize: 12,
    color: "#64748b",
    margin: 0,
    lineHeight: 1.4,
  },
  xBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    padding: 6,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.15s",
  },

  // ── Body
  body: {
    display: "grid",
    gridTemplateColumns: "1fr 220px",
    gap: 0,
  },

  // ── Calendar panel
  calendarPanel: {
    padding: "24px 24px 20px",
    borderRight: "1px solid #f1f5f9",
  },
  monthNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
  },
  navBtn: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#475569",
    transition: "all 0.15s",
  },
  dayHeaders: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    marginBottom: 8,
  },
  dayHeader: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "4px 0",
  },
  dayGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 3,
  },
  dayCell: {
    aspectRatio: "1",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    color: "#334155",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
  dayCellPast: {
    color: "#cbd5e1",
    cursor: "not-allowed",
    background: "transparent",
  },
  dayCellToday: {
    background: "#dbeafe",
    color: "#1a4f8a",
    fontWeight: 700,
  },
  dayCellSelected: {
    background: "#1a6b4a",
    color: "#ffffff",
    fontWeight: 700,
    boxShadow: "0 2px 8px rgba(26,107,74,0.35)",
  },
  dayCellHoverable: {
    // Applied alongside base — hover handled via inline onMouseEnter/Leave
  },

  // ── Legend
  legend: {
    display: "flex",
    gap: 16,
    marginTop: 16,
    paddingTop: 14,
    borderTop: "1px solid #f1f5f9",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11,
    color: "#94a3b8",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },

  // ── Time slots panel
  timesPanel: {
    padding: "24px 20px",
    background: "#fafbfc",
  },
  timesLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 2px",
  },
  timesSub: {
    fontSize: 11,
    color: "#94a3b8",
    margin: "0 0 14px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  slotsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 6,
  },
  slotBtn: {
    padding: "9px 6px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
    border: "1.5px solid transparent",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    textAlign: "center",
  },
  slotDisabled: {
    background: "#f1f5f9",
    color: "#cbd5e1",
    cursor: "not-allowed",
    border: "1.5px solid #f1f5f9",
  },
  slotAvailable: {
    background: "#ffffff",
    color: "#334155",
    border: "1.5px solid #e2e8f0",
  },
  slotActive: {
    background: "#1a6b4a",
    color: "#ffffff",
    border: "1.5px solid #1a6b4a",
    boxShadow: "0 2px 8px rgba(26,107,74,0.3)",
    fontWeight: 700,
  },

  // ── Footer
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderTop: "1px solid #f1f5f9",
    background: "#f8fafc",
    gap: 16,
  },
  selectionSummary: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "#64748b",
    flex: 1,
  },
  submitBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 24px",
    borderRadius: 10,
    border: "none",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  submitActive: {
    background: "#1a4f8a",
    color: "#ffffff",
    boxShadow: "0 4px 14px rgba(26,79,138,0.35)",
  },
  submitDisabled: {
    background: "#e2e8f0",
    color: "#94a3b8",
    cursor: "not-allowed",
    boxShadow: "none",
  },

  // ── Confirmed screen
  confirmedBox: {
    padding: "48px 32px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  checkCircle: {
    marginBottom: 4,
  },
  confirmedTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  confirmedSub: {
    fontSize: 15,
    fontWeight: 600,
    color: "#1a6b4a",
    margin: 0,
  },
  confirmedNote: {
    fontSize: 13,
    color: "#64748b",
    maxWidth: 380,
    lineHeight: 1.6,
    margin: "4px 0 12px",
  },
  closeBtn: {
    background: "#1a4f8a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  },
};
