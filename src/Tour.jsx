import { useState, useEffect } from "react";

// Four onboarding steps, one per core feature. Centered cards — no anchoring,
// so this renders identically on mobile and desktop and never points at a
// hidden element (e.g. filters inside the closed mobile drawer).
export const TOUR_STEPS = [
  {
    icon: "filters",
    title: "Фильтры",
    text: "Сужайте список поставщиков по категории, городу, типу и условиям доставки.",
  },
  {
    icon: "chat",
    title: "Чат-подбор",
    text: "Опишите задачу обычными словами — ассистент задаст уточняющие вопросы и подберёт поставщиков.",
  },
  {
    icon: "compare",
    title: "Сравнение",
    text: "Добавьте до трёх поставщиков и сравните их характеристики бок о бок в таблице.",
  },
  {
    icon: "saved",
    title: "Избранное",
    text: "Сохраняйте подходящих поставщиков, чтобы вернуться к ним и связаться позже.",
  },
];

function StepIcon({ name }) {
  // Inline SVGs keep the component self-contained (no icon-font dependency).
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "filters":
      return (
        <svg {...common}>
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="10" y1="18" x2="14" y2="18" />
        </svg>
      );
    case "chat":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-4-1L3 20l1.5-5.5a8.38 8.38 0 0 1-1-4A8.5 8.5 0 0 1 12 2a8.5 8.5 0 0 1 9 9.5z" />
        </svg>
      );
    case "compare":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="7" height="16" rx="1" />
          <rect x="14" y="4" width="7" height="16" rx="1" />
        </svg>
      );
    case "saved":
      return (
        <svg {...common}>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      );
    default:
      return null;
  }
}

export function Tour({ onClose }) {
  const [step, setStep] = useState(0);
  const last = step === TOUR_STEPS.length - 1;
  const s = TOUR_STEPS[step];

  // Allow Esc to skip, arrow keys to navigate.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && !last) setStep((n) => n + 1);
      else if (e.key === "ArrowLeft" && step > 0) setStep((n) => n - 1);
      else if (e.key === "Enter" && last) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, last, onClose]);

  return (
    <div className="tour-overlay" onClick={onClose}>
      <div className="tour-card" onClick={(e) => e.stopPropagation()}>
        <button className="tour-skip" onClick={onClose}>
          Пропустить
        </button>

        <div className="tour-icon">
          <StepIcon name={s.icon} />
        </div>
        <div className="tour-step-label">
          Шаг {step + 1} из {TOUR_STEPS.length}
        </div>
        <h3 className="tour-title">{s.title}</h3>
        <p className="tour-text">{s.text}</p>

        <div className="tour-dots">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`tour-dot ${i === step ? "on" : ""}`}
              onClick={() => setStep(i)}
            />
          ))}
        </div>

        <div className="tour-nav">
          {step > 0 ? (
            <button className="tour-back" onClick={() => setStep((n) => n - 1)}>
              Назад
            </button>
          ) : (
            <span />
          )}
          {last ? (
            <button className="tour-next" onClick={onClose}>
              Понятно
            </button>
          ) : (
            <button className="tour-next" onClick={() => setStep((n) => n + 1)}>
              Далее
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Floating bottom-right button that re-opens the tour on demand.
export function HelpButton({ onClick }) {
  return (
    <button className="help-fab" onClick={onClick} aria-label="Как это работает">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-4-1L3 20l1.5-5.5a8.38 8.38 0 0 1-1-4A8.5 8.5 0 0 1 12 2a8.5 8.5 0 0 1 9 9.5z" />
        <path d="M9.6 9.2a2.4 2.4 0 0 1 4.7.7c0 1.6-2.4 2.4-2.4 2.4" />
        <line x1="12" y1="16.2" x2="12" y2="16.2" />
      </svg>
    </button>
  );
}
