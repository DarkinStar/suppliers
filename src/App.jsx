import { useState, useMemo, useEffect } from "react";
import "./App.css";
import {
  SUPPLIERS,
  CATEGORIES,
  CITIES,
  PRODUCER_OPTIONS,
  DELIVERY_OPTIONS,
  YESNO_OPTIONS,
  EMPTY_FILTERS,
  applyFilters,
  show,
  NA,
} from "./data";
import { useLocalStorage } from "./useLocalStorage";
import { DetailModal, CompareModal } from "./Modals";
import { Tour, HelpButton } from "./Tour";

const MAX_COMPARE = 3;
const byId = Object.fromEntries(SUPPLIERS.map((s) => [s.id, s]));

function cardTags(s) {
  const tags = [];
  if (s.horeca === true) tags.push({ label: "Для общепита", cls: "accent" });
  if (s.halal === true) tags.push({ label: "Халяль", cls: "green" });
  if (s.own_production === true) tags.push({ label: "Производитель", cls: "" });
  if (s.delivery_own_transport === true) tags.push({ label: "Своя доставка", cls: "" });
  if (s.delivery_russia === true) tags.push({ label: "По России", cls: "" });
  if (s.wholesale_small === true) tags.push({ label: "Мелкий опт", cls: "" });
  return tags.slice(0, 4);
}

function CardContact({ k, value, href }) {
  const isNA = value === null || value === undefined || value === "";
  return (
    <div className="contact-row">
      <span className="k">{k}</span>
      {isNA ? (
        <span className="v na">{NA}</span>
      ) : href ? (
        <a href={href} onClick={(e) => e.stopPropagation()}>
          {value}
        </a>
      ) : (
        <span className="v">{value}</span>
      )}
    </div>
  );
}

function SupplierCard({ s, onOpen }) {
  const tags = cardTags(s);
  return (
    <div className="card" onClick={() => onOpen(s.id)}>
      <div className="card-top">
        <div>
          <div className="card-name">{s.name}</div>
          <div className="card-city">
            {show(s.city)}
            {s.district ? ` · ${s.district}` : ""}
          </div>
        </div>
      </div>

      <div className="card-cats">
        {(s.categories || []).map((c) => (
          <span className="cat-tag" key={c}>
            {c}
          </span>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="card-tags">
          {tags.map((t, i) => (
            <span className={`tag ${t.cls}`} key={i}>
              {t.label}
            </span>
          ))}
        </div>
      )}

      <div className="card-contact">
        <CardContact
          k="тел"
          value={s.phone}
          href={s.phone ? `tel:${s.phone.replace(/[^\d+]/g, "")}` : null}
        />
        <CardContact
          k="email"
          value={s.email}
          href={s.email ? `mailto:${s.email}` : null}
        />
        <CardContact
          k="сайт"
          value={s.website ? s.website.replace(/^https?:\/\//, "") : null}
          href={s.website}
        />
      </div>
    </div>
  );
}

export default function App() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [tab, setTab] = useState("filters"); // filters | saved
  const [wishlist, setWishlist] = useLocalStorage("sf_wishlist", []);
  const [compareIds, setCompareIds] = useState([]); // React state — resets on tab close
  const [detailId, setDetailId] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false); // mobile filters drawer

  // onboarding tour — show once per browser, re-openable via help button
  const [tourSeen, setTourSeen] = useLocalStorage("sf_tour_seen", false);
  const [tourOpen, setTourOpen] = useState(false);

  // open the tour automatically the first time a user lands
  useEffect(() => {
    if (!tourSeen) setTourOpen(true);
  }, [tourSeen]);

  const closeTour = () => {
    setTourOpen(false);
    if (!tourSeen) setTourSeen(true);
  };

  // chat
  const [chatLog, setChatLog] = useState([]); // [{role, text}]
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState(null);

  const results = useMemo(() => applyFilters(SUPPLIERS, filters), [filters]);

  const toggleCategory = (cat) =>
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));

  const set = (key) => (e) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  // wishlist
  const toggleSave = (id) =>
    setWishlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));

  // compare — FIFO, max 3
  const toggleCompare = (id) =>
    setCompareIds((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id);
      if (c.length >= MAX_COMPARE) return [...c.slice(1), id]; // drop oldest
      return [...c, id];
    });
  const removeCompare = (id) =>
    setCompareIds((c) => c.filter((x) => x !== id));

  // chat → /api/chat → replace filters with returned set
  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy) return;

    const nextLog = [...chatLog, { role: "user", text }];
    setChatLog(nextLog);
    setChatInput("");
    setChatBusy(true);
    setChatError(null);

    // Build message history for the API (role/content pairs).
    const apiMessages = nextLog.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Replace filters wholesale with the AI's complete current picture.
      if (data.filters && typeof data.filters === "object") {
        setFilters({
          categories: Array.isArray(data.filters.categories)
            ? data.filters.categories
            : [],
          city: data.filters.city || "any",
          producer: data.filters.producer || "any",
          delivery: data.filters.delivery || "any",
          horeca: data.filters.horeca || "any",
          halal: data.filters.halal || "any",
        });
        setTab("filters"); // show the updated filters
        setDrawerOpen(false); // on mobile, reveal the updated list
      }

      setChatLog([
        ...nextLog,
        { role: "assistant", text: data.reply || "Готово." },
      ]);
    } catch (err) {
      setChatError("Не удалось связаться с ассистентом. Попробуйте ещё раз.");
      setChatLog(nextLog); // keep the user message, drop the failed reply
    } finally {
      setChatBusy(false);
    }
  };

  const openDetail = (id) => {
    setDetailId(id);
    setCompareOpen(false);
  };

  const activeCount =
    filters.categories.length +
    ["city", "producer", "delivery", "horeca", "halal"].filter(
      (k) => filters[k] !== "any"
    ).length;

  const compareSuppliers = compareIds.map((id) => byId[id]).filter(Boolean);
  const savedSuppliers = wishlist.map((id) => byId[id]).filter(Boolean);
  const detail = detailId ? byId[detailId] : null;

  return (
    <div className="app">
      {/* mobile-only backdrop behind the drawer */}
      <div
        className={`drawer-backdrop ${drawerOpen ? "show" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* ── Sidebar ─────────────────────────────── */}
      <aside className={`sidebar ${drawerOpen ? "open" : ""}`}>
        <button
          className="drawer-close"
          onClick={() => setDrawerOpen(false)}
          aria-label="Закрыть"
        >
          ✕
        </button>
        <div className="sidebar-head">
          <div className="brand">
            Поставщики<span className="dot">.</span>
          </div>
          <div className="brand-sub">
            Поиск и сравнение поставщиков продуктов · Екатеринбург
          </div>
        </div>

        <div className="seg">
          <button
            className={tab === "filters" ? "active" : ""}
            onClick={() => setTab("filters")}
          >
            Фильтры
            {activeCount > 0 && <span className="count">{activeCount}</span>}
          </button>
          <button
            className={tab === "saved" ? "active" : ""}
            onClick={() => setTab("saved")}
          >
            Сохранённые
            {wishlist.length > 0 && (
              <span className="count">{wishlist.length}</span>
            )}
          </button>
        </div>

        {tab === "filters" ? (
          <div className="filters">
            <div className="filter-group">
              <label className="filter-label">Категория</label>
              <div className="chips">
                {CATEGORIES.map((c) => (
                  <span
                    key={c}
                    className={`chip ${filters.categories.includes(c) ? "on" : ""}`}
                    onClick={() => toggleCategory(c)}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-label">Город</label>
              <select className="select" value={filters.city} onChange={set("city")}>
                <option value="any">Любой город</option>
                {CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Тип поставщика</label>
              <select className="select" value={filters.producer} onChange={set("producer")}>
                {PRODUCER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Доставка</label>
              <select className="select" value={filters.delivery} onChange={set("delivery")}>
                {DELIVERY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Для общепита (HoReCa)</label>
              <select className="select" value={filters.horeca} onChange={set("horeca")}>
                {YESNO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Халяль</label>
              <select className="select" value={filters.halal} onChange={set("halal")}>
                {YESNO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <button className="reset" onClick={() => setFilters(EMPTY_FILTERS)}>
              Сбросить фильтры
            </button>
          </div>
        ) : (
          <>
            {savedSuppliers.length === 0 ? (
              <div className="saved-empty">
                Здесь появятся сохранённые поставщики.
                <br />
                Откройте карточку и нажмите «♡ В избранное».
              </div>
            ) : (
              <div className="saved-list">
                {savedSuppliers.map((s) => (
                  <div
                    key={s.id}
                    className="saved-item"
                    onClick={() => openDetail(s.id)}
                  >
                    <div>
                      <div className="saved-item-name">{s.name}</div>
                      <div className="saved-item-meta">
                        {show(s.city)} · {(s.categories || [])[0] || ""}
                      </div>
                    </div>
                    <button
                      className="saved-item-x"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSave(s.id);
                      }}
                      aria-label="Убрать из избранного"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </aside>

      {/* ── Main ────────────────────────────────── */}
      <main className="main">
        <div className="topbar">
          <button
            className="drawer-toggle"
            onClick={() => setDrawerOpen(true)}
          >
            Фильтры
            {activeCount > 0 && <span className="badge">{activeCount}</span>}
          </button>
          <button
            className="compare-btn"
            onClick={() => setCompareOpen(true)}
            disabled={compareIds.length === 0}
          >
            Сравнить
            {compareIds.length > 0 && (
              <span className="badge">{compareIds.length}</span>
            )}
          </button>
        </div>

        <div className="chat">
          <div className="chat-msgs">
            {chatLog.length === 0 ? (
              <div className="chat-hint">
                <span className="ai-dot">AI</span>
                <span>
                  Опишите, что вам нужно — например, «мясо для ресторана в
                  Екатеринбурге с доставкой». Я подберу поставщиков и уточню
                  детали.
                </span>
              </div>
            ) : (
              chatLog.map((m, i) =>
                m.role === "user" ? (
                  <div className="chat-msg user" key={i}>
                    {m.text}
                  </div>
                ) : (
                  <div className="chat-hint" key={i}>
                    <span className="ai-dot">AI</span>
                    <span>{m.text}</span>
                  </div>
                )
              )
            )}
            {chatBusy && (
              <div className="chat-hint">
                <span className="ai-dot">AI</span>
                <span style={{ color: "var(--text-faint)" }}>Подбираю…</span>
              </div>
            )}
            {chatError && <div className="chat-err">{chatError}</div>}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="Что ищете?"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendChat();
              }}
              disabled={chatBusy}
            />
            <button
              className="chat-send active"
              onClick={sendChat}
              disabled={chatBusy || !chatInput.trim()}
            >
              Отправить
            </button>
          </div>
        </div>

        <div className="results">
          <div className="results-head">
            <span className="results-title">Поставщики</span>
            <span className="results-count">
              {results.length}{" "}
              {results.length === 1
                ? "поставщик"
                : results.length >= 2 && results.length <= 4
                ? "поставщика"
                : "поставщиков"}
            </span>
          </div>

          {results.length > 0 ? (
            <div className="grid">
              {results.map((s) => (
                <SupplierCard key={s.id} s={s} onOpen={openDetail} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h3>Ничего не найдено</h3>
              <div>Попробуйте убрать часть фильтров.</div>
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ──────────────────────────────── */}
      {detail && (
        <DetailModal
          supplier={detail}
          onClose={() => setDetailId(null)}
          onToggleSave={toggleSave}
          onToggleCompare={toggleCompare}
          isSaved={wishlist.includes(detail.id)}
          isCompared={compareIds.includes(detail.id)}
          compareFull={compareIds.length >= MAX_COMPARE}
        />
      )}

      {compareOpen && (
        <CompareModal
          suppliers={compareSuppliers}
          onClose={() => setCompareOpen(false)}
          onRemove={removeCompare}
          onOpenDetail={openDetail}
        />
      )}

      {/* ── Onboarding ──────────────────────────── */}
      {tourOpen && <Tour onClose={closeTour} />}
      <HelpButton onClick={() => setTourOpen(true)} />
    </div>
  );
}
