import React, { useState, useEffect, useRef } from "react";
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
  date: string;
  startTime: string;
  endTime: string;
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

interface ApiErrorResponse {
  error: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${ampm}`;
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

// ─── Consultation Terms ───────────────────────────────────────────────────────

const CONSULTATION_TERMS = `This free 15-minute consultation is a preliminary informational meeting with a licensed US VizExgration attorney. It does not constitute legal advice and does not create an attorney-client relationship between you and VizEx, the Platform Operator, or the attorney conducting the consultation.

No attorney-client relationship is formed unless you separately retain an attorney through a written engagement agreement.

The consultation is conducted in the language you selected above. VizEx will confirm your appointment within 24-48 hours. If a matched attorney is not available for your selected slot, VizEx will notify you and offer the nearest available alternative.

The attorney conducting your consultation is an independent licensed attorney, not an employee or agent of VizEx. VizEx is not responsible for the professional conduct of any participating attorney.

There is no cost to you. You are under no obligation to retain any attorney. VizEx does not receive any portion of any legal fee from any resulting engagement.

VizEx will forward a structured lead summary to your matched attorney before your consultation. This summary includes your submitted data and the AI session you completed. By submitting this form you consent to this disclosure.`;

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    new Date(today),
  );
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Form fields
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [citizenshipCountry, setCitizenshipCountry] = useState("");
  const [residenceCountry, setResidenceCountry] = useState("");
  const [language, setLanguage] = useState<"English" | "Spanish" | "">("");
  const [VizExgrationGoal, setVizExgrationGoal] = useState("");
  const [timeSensitivity, setTimeSensitivity] = useState<
    "weeks" | "months" | "none" | ""
  >("");
  const [timelineDetail, setTimelineDetail] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [mobileStep, setMobileStep] = useState<"calendar" | "times">(
    "calendar",
  );

  const goalCharCount = VizExgrationGoal.length;

  useEffect(() => {
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const res = await apiClient.post<{ total: number; slots: Slot[] }>(
          "/VizEx-mangage-appointments",
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
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) newErrors.email = "Email address is required.";
    else if (!emailRegex.test(email))
      newErrors.email = "Enter a valid email address.";
    if (!firstName.trim()) newErrors.firstName = "First name is required.";
    if (!lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!citizenshipCountry.trim())
      newErrors.citizenshipCountry = "Country of citizenship is required.";
    if (!residenceCountry.trim())
      newErrors.residenceCountry = "Country of residence is required.";
    if (!language) newErrors.language = "Please select a preferred language.";
    if (!VizExgrationGoal.trim())
      newErrors.VizExgrationGoal = "Please describe your VizExgration goal.";
    if (!timeSensitivity)
      newErrors.timeSensitivity = "Please select a time sensitivity option.";
    if (
      (timeSensitivity === "weeks" || timeSensitivity === "months") &&
      !timelineDetail.trim()
    )
      newErrors.timelineDetail =
        "Please briefly describe your timeline or deadline.";
    if (!termsAccepted)
      newErrors.terms =
        "Please confirm you have read and accept the consultation terms.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedSlot) return;
    if (!validate()) return;
    setBookingLoading(true);
    setBookingError(null);
    try {
      await apiClient.post("/VizEx-mangage-appointments", {
        action: "book",
        slotId: selectedSlot.id,
        bookedBy: {
          email: email.trim(),
          phone: phone.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          citizenshipCountry: citizenshipCountry.trim(),
          residenceCountry: residenceCountry.trim(),
          language,
          VizExgrationGoal: VizExgrationGoal.trim(),
          timeSensitivity,
          timelineDetail: timelineDetail.trim(),
        },
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
      } else {
        setBookingError("Booking failed. Please try again.");
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const canSubmit = !!(selectedDate && selectedSlot);

  // ── Success screen ───────────────────────────────────────────────────────
  if (submitted && selectedDate && selectedSlot) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden font-sans">
        <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
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
          <p className="text-xl font-bold text-slate-900 m-0">
            Appointment Requested!
          </p>
          <p className="text-sm font-semibold text-green-600 m-0">
            {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()},{" "}
            {selectedDate.getFullYear()} · {formatTime(selectedSlot.startTime)}
          </p>
          <p className="text-sm text-slate-500 max-w-sm leading-relaxed mt-1 mb-2">
            Hi <strong>{firstName}</strong>, a confirmation will be sent to{" "}
            <strong>{email}</strong>. A consultant will confirm your slot within
            1–2 business days.
          </p>
          <button
            onClick={onClose}
            className="px-7 py-2.5 rounded-xl border-none bg-gradient-to-br from-red-700 to-red-900 text-white text-sm font-bold cursor-pointer"
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  // ── Field error helper ───────────────────────────────────────────────────
  const FieldError = ({ field }: { field: string }) =>
    errors[field] ? (
      <p className="text-xs text-red-500 mt-1">{errors[field]}</p>
    ) : null;

  const inputClass = (field: string) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm text-slate-800 outline-none transition-colors font-[inherit] ${
      errors[field]
        ? "border-red-400 bg-red-50"
        : "border-slate-200 bg-white focus:border-blue-500"
    }`;

  const labelClass =
    "block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1";

  // ── Calendar panel ────────────────────────────────────────────────────────
  const CalendarPanel = (
    <div
      className={`${isMobile ? "w-full p-4" : "flex-none w-[340px] p-5"} border-b sm:border-b-0 sm:border-r border-slate-100`}
    >
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors"
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
        </button>
        <span className="text-sm font-bold text-slate-900">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-500 cursor-pointer hover:bg-slate-100 transition-colors"
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
            <polyline points="6,3 11,8 6,13" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1.5">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const past = isPast(day);
          const sel = isSelected(day);
          const tod = isToday(day);
          const hasDot = !past && hasSlots(day) && !sel;
          return (
            <button
              key={day}
              onClick={() => selectDay(day)}
              onMouseEnter={() => !past && setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              disabled={past}
              className={`
                relative aspect-square rounded-lg text-[13px] font-medium border-none cursor-pointer transition-all flex flex-col items-center justify-center gap-px
                ${isMobile ? "min-h-[38px] text-xs" : ""}
                ${
                  sel
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-200"
                    : tod
                      ? "bg-blue-100 text-blue-700 font-bold"
                      : past
                        ? "text-slate-300 cursor-not-allowed bg-transparent"
                        : "text-slate-600 bg-transparent hover:bg-slate-100"
                }
              `}
            >
              {day}
              {hasDot && (
                <span className="w-1 h-1 rounded-full bg-green-500 absolute bottom-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
        {[
          { color: "bg-blue-100 border border-blue-400", label: "Today" },
          { color: "bg-blue-600", label: "Selected" },
          {
            color: "bg-transparent border border-slate-300",
            label: "Unavailable",
          },
          { color: "bg-green-500", label: "Has slots", dot: true },
        ].map((l) => (
          <span
            key={l.label}
            className="flex items-center gap-1.5 text-[10px] text-slate-400"
          >
            <span
              className={`${l.dot ? "w-1.5 h-1.5 rounded-full" : "w-2 h-2 rounded-sm"} inline-block ${l.color}`}
            />
            {l.label}
          </span>
        ))}
      </div>

      {slotsError && (
        <p className="text-xs text-red-500 mt-3 text-center">{slotsError}</p>
      )}
    </div>
  );

  // ── Times + Form panel ────────────────────────────────────────────────────
  const TimesPanel = (
    <div className="flex-1 flex flex-col overflow-y-auto max-h-[75vh] sm:max-h-[600px]">
      <div className="p-4 sm:p-5">
        {/* Mobile: back button */}
        {isMobile && (
          <button
            onClick={() => {
              setMobileStep("calendar");
              setSelectedSlot(null);
            }}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-sm text-blue-600 font-semibold pb-3 font-[inherit]"
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

        <p className="text-sm font-bold text-slate-900 m-0">
          {selectedDate
            ? `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getDate()}`
            : "Select a date"}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5 mb-3 uppercase tracking-wide">
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
          className={`grid gap-1.5 mb-5 ${isMobile ? "grid-cols-3" : "grid-cols-2"}`}
        >
          {slotsLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <button
                key={"sk" + i}
                disabled
                className="py-2.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-300 border border-slate-100 cursor-not-allowed"
              >
                ——
              </button>
            ))}
          {!slotsLoading && selectedDate && slotsForDate.length === 0 && (
            <p className="col-span-full text-sm text-slate-400">
              No available slots for this date. Try another day.
            </p>
          )}
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
                  className={`
                  py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer border font-[inherit] text-center
                  ${
                    active
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-md shadow-blue-200"
                      : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                  }
                `}
                >
                  {formatTime(slot.startTime)}
                </button>
              );
            })}
        </div>

        {/* ── Extended Form ───────────────────────────────────────────── */}
        {selectedSlot && (
          <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider m-0">
              Your Details
            </p>

            {/* Field 1 — Email */}
            <div>
              <label className={labelClass}>
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                }}
                className={inputClass("email")}
              />
              <FieldError field="email" />
            </div>

            {/* Field 2 — Phone */}
            <div>
              <label className={labelClass}>Phone / WhatsApp</label>
              <input
                type="tel"
                placeholder="+1 (305) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none transition-colors font-[inherit] focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Optional — useful if we need to reach you about your
                appointment.
              </p>
            </div>

            {/* Row 3 — Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (errors.firstName)
                      setErrors((p) => ({ ...p, firstName: "" }));
                  }}
                  className={inputClass("firstName")}
                />
                <FieldError field="firstName" />
              </div>
              <div>
                <label className={labelClass}>
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (errors.lastName)
                      setErrors((p) => ({ ...p, lastName: "" }));
                  }}
                  className={inputClass("lastName")}
                />
                <FieldError field="lastName" />
              </div>
            </div>

            {/* Row 4 — Geography */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Country of Citizenship <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Brazil, India, Mexico…"
                  value={citizenshipCountry}
                  onChange={(e) => {
                    setCitizenshipCountry(e.target.value);
                    if (errors.citizenshipCountry)
                      setErrors((p) => ({ ...p, citizenshipCountry: "" }));
                  }}
                  className={inputClass("citizenshipCountry")}
                />
                <FieldError field="citizenshipCountry" />
              </div>
              <div>
                <label className={labelClass}>
                  Country of Residence <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. United States, Mexico…"
                  value={residenceCountry}
                  onChange={(e) => {
                    setResidenceCountry(e.target.value);
                    if (errors.residenceCountry)
                      setErrors((p) => ({ ...p, residenceCountry: "" }));
                  }}
                  className={inputClass("residenceCountry")}
                />
                <FieldError field="residenceCountry" />
              </div>
            </div>

            {/* Field 5 — Language */}
            <div>
              <label className={labelClass}>
                Preferred Consultation Language{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-5 mt-1">
                {(["English", "Spanish"] as const).map((lang) => (
                  <label
                    key={lang}
                    className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 font-medium"
                  >
                    <input
                      type="radio"
                      name="language"
                      value={lang}
                      checked={language === lang}
                      onChange={() => {
                        setLanguage(lang);
                        if (errors.language)
                          setErrors((p) => ({ ...p, language: "" }));
                      }}
                      className="accent-blue-600 w-4 h-4 cursor-pointer"
                    />
                    {lang}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                If you require another language, please note it in the goal
                field below and we will confirm availability.
              </p>
              <FieldError field="language" />
            </div>

            {/* Field 6 — VizExgration goal */}
            <div>
              <label className={labelClass}>
                What are you trying to accomplish?{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="In one or two sentences — e.g. 'I want to bring my spouse to the US' or 'My employer is considering sponsoring me for an H-1B'"
                value={VizExgrationGoal}
                maxLength={500}
                onChange={(e) => {
                  if (e.target.value.length <= 500) {
                    setVizExgrationGoal(e.target.value);
                    if (errors.VizExgrationGoal)
                      setErrors((p) => ({ ...p, VizExgrationGoal: "" }));
                  }
                }}
                className={`${inputClass("VizExgrationGoal")} resize-y min-h-[80px]`}
              />
              <div className="flex justify-between items-center mt-1">
                <FieldError field="VizExgrationGoal" />
                <span
                  className={`text-[11px] ml-auto ${
                    goalCharCount >= 500
                      ? "text-red-500 font-semibold"
                      : goalCharCount >= 300
                        ? "text-amber-500"
                        : goalCharCount >= 200
                          ? "text-slate-500"
                          : "text-transparent"
                  }`}
                >
                  {goalCharCount >= 200 &&
                    (goalCharCount >= 300
                      ? `Focus on the most important detail. (${goalCharCount}/500)`
                      : `${goalCharCount}/500`)}
                </span>
              </div>
            </div>

            {/* Field 7 — Time sensitivity */}
            <div>
              <label className={labelClass}>
                Is there anything time-sensitive about your situation?{" "}
                <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-col gap-2 mt-1">
                {[
                  { value: "weeks", label: "Yes — I need to act within weeks" },
                  {
                    value: "months",
                    label: "Yes — developing over the next few months",
                  },
                  {
                    value: "none",
                    label: "No immediate deadline that I am aware of",
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-start gap-2 cursor-pointer text-sm text-slate-700"
                  >
                    <input
                      type="radio"
                      name="timeSensitivity"
                      value={opt.value}
                      checked={timeSensitivity === opt.value}
                      onChange={() => {
                        setTimeSensitivity(opt.value as typeof timeSensitivity);
                        if (errors.timeSensitivity)
                          setErrors((p) => ({ ...p, timeSensitivity: "" }));
                        if (opt.value === "none") setTimelineDetail("");
                      }}
                      className="accent-blue-600 w-4 h-4 cursor-pointer mt-0.5 shrink-0"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <FieldError field="timeSensitivity" />

              {/* Conditional timeline textarea */}
              {(timeSensitivity === "weeks" ||
                timeSensitivity === "months") && (
                <div className="mt-3">
                  <label className={labelClass}>
                    Please briefly describe the timeline or deadline{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    placeholder="e.g. My current visa expires in 6 weeks…"
                    value={timelineDetail}
                    onChange={(e) => {
                      setTimelineDetail(e.target.value);
                      if (errors.timelineDetail)
                        setErrors((p) => ({ ...p, timelineDetail: "" }));
                    }}
                    className={`${inputClass("timelineDetail")} resize-y min-h-[60px]`}
                  />
                  <FieldError field="timelineDetail" />
                </div>
              )}
            </div>

            {/* Consultation Terms */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mt-1">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Terms of this consultation
              </p>
              <div className="text-[12px] text-slate-500 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {CONSULTATION_TERMS}
              </div>
            </div>

            {/* Terms checkbox */}
            <div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (errors.terms) setErrors((p) => ({ ...p, terms: "" }));
                  }}
                  className="accent-blue-600 w-4 h-4 mt-0.5 cursor-pointer shrink-0"
                />
                <span className="text-sm text-slate-700 leading-snug">
                  I have read and accept the consultation terms above.
                </span>
              </label>
              <FieldError field="terms" />
            </div>

            {bookingError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {bookingError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ── Main UI ──────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shrink-0">
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
            <p className="text-sm font-bold text-slate-900 m-0">
              Schedule a Consultation
            </p>
            <p className="text-[11px] text-slate-500 m-0">
              {isMobile
                ? "Select a date & time"
                : "Select a date & time with an VizExgration expert"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-transparent border-none cursor-pointer hover:bg-slate-100 transition-colors"
        >
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
        <div className="flex border-b border-slate-100">
          {(["calendar", "times"] as const).map((step, idx) => (
            <div
              key={step}
              className={`
                flex-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide transition-all
                ${
                  mobileStep === step
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-slate-400 border-b-2 border-transparent"
                }
              `}
            >
              {idx + 1}. {step === "calendar" ? "Choose Date" : "Choose Time"}
            </div>
          ))}
        </div>
      )}

      {/* Body */}
      <div
        className={`flex ${isMobile ? "flex-col" : "flex-row"} min-h-[380px]`}
      >
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
        className={`
        flex border-t border-slate-100 bg-slate-50
        ${isMobile ? "flex-col items-stretch gap-2.5 px-4 py-3" : "flex-row items-center justify-between px-5 py-3.5 gap-3"}
      `}
      >
        <div className="flex items-center gap-1.5 text-sm text-slate-500 flex-1">
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
                className={`text-green-600 font-semibold ${isMobile ? "text-xs" : "text-sm"}`}
              >
                {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()},{" "}
                {selectedDate.getFullYear()} ·{" "}
                {formatTime(selectedSlot.startTime)}
              </span>
            </>
          ) : (
            <span
              className={`text-slate-400 ${isMobile ? "text-xs" : "text-sm"}`}
            >
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
          className={`
            flex items-center justify-center gap-1.5 rounded-xl border-none text-sm font-bold cursor-pointer transition-all whitespace-nowrap font-[inherit]
            ${isMobile ? "w-full py-3.5 px-4" : "py-2.5 px-5"}
            ${
              canSubmit && !bookingLoading
                ? "bg-gradient-to-br from-red-700 to-red-900 text-white shadow-lg shadow-red-200 hover:from-red-800 hover:to-red-950"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }
            ${bookingLoading ? "opacity-75" : ""}
          `}
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
              Submit consultation request
            </>
          )}
        </button>
      </div>
    </div>
  );
}
