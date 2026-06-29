import { show, showBool, NA } from "./data";

// ── Shared field row ─────────────────────────────────────
function Field({ label, value, href, isBool }) {
  let display, na;
  if (isBool) {
    display = showBool(value);
    na = value === null || value === undefined;
  } else {
    const empty =
      value === null ||
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    display = show(value);
    na = empty;
  }
  return (
    <div className="field">
      <span className="fk">{label}</span>
      <span className={`fv ${na ? "na" : ""}`}>
        {href && !na ? (
          <a href={href} target="_blank" rel="noreferrer">
            {display}
          </a>
        ) : (
          display
        )}
      </span>
    </div>
  );
}

// ── Supplier detail window ───────────────────────────────
export function DetailModal({ supplier: s, onClose, onToggleSave, onToggleCompare, isSaved, isCompared, compareFull }) {
  const phoneHref = s.phone ? `tel:${s.phone.replace(/[^\d+]/g, "")}` : null;
  const emailHref = s.email ? `mailto:${s.email}` : null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{s.name}</div>
            <div className="modal-subtitle">
              {show(s.city)}
              {s.district ? ` · ${s.district}` : ""}
              {s.region ? ` · ${s.region}` : ""}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="detail-cats">
            {(s.categories || []).map((c) => (
              <span className="detail-tag" key={c}>
                {c}
              </span>
            ))}
          </div>

          <div className="detail-section-label">Контакты</div>
          <Field label="Телефон" value={s.phone} href={phoneHref} />
          <Field label="Email" value={s.email} href={emailHref} />
          <Field
            label="Сайт"
            value={s.website ? s.website.replace(/^https?:\/\//, "") : null}
            href={s.website}
          />
          <Field label="Адрес" value={s.address} />

          <div className="detail-section-label">Условия</div>
          <Field label="Минимальный заказ" value={s.moq_text} />
          <Field label="Производитель" value={s.own_production} isBool />
          <Field label="Мелкий опт" value={s.wholesale_small} isBool />
          <Field label="Отсрочка платежа" value={s.deferred_payment} isBool />
          <Field label="Для общепита" value={s.horeca} isBool />
          <Field label="Халяль" value={s.halal} isBool />

          <div className="detail-section-label">Доставка</div>
          <Field label="Своя доставка" value={s.delivery_own_transport} isBool />
          <Field label="Самовывоз" value={s.delivery_pickup} isBool />
          <Field label="По России" value={s.delivery_russia} isBool />
          <Field
            label="Бесплатно от"
            value={s.free_delivery_over ? `${s.free_delivery_over} ₽` : null}
          />
          <Field label="Доставка на след. день" value={s.next_day_delivery} isBool />

          <div className="detail-section-label">Прочее</div>
          <Field label="Документы" value={s.docs} />
          <Field label="ЭДО" value={s.edo} isBool />
          <Field label="Работа с" value={s.clients} />
          <Field label="Подкатегории" value={s.subcategories} />
          <Field label="Заметки" value={s.notes} />
          <Field
            label="Источник"
            value={s.source ? s.source.replace(/^https?:\/\//, "").slice(0, 40) + "…" : null}
            href={s.source}
          />
        </div>

        <div className="modal-actions">
          <button
            className={`act-btn ${isSaved ? "on" : ""}`}
            onClick={() => onToggleSave(s.id)}
          >
            {isSaved ? "✓ В избранном" : "♡ В избранное"}
          </button>
          <button
            className={`act-btn ${isCompared ? "on-green" : ""}`}
            onClick={() => onToggleCompare(s.id)}
            disabled={!isCompared && compareFull}
            title={!isCompared && compareFull ? "В сравнении максимум 3 поставщика" : ""}
          >
            {isCompared ? "✓ В сравнении" : "⊕ К сравнению"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compare window ───────────────────────────────────────
const COMPARE_ROWS = [
  { label: "Город", get: (s) => show(s.city) },
  { label: "Категории", get: (s) => show(s.categories) },
  { label: "Телефон", get: (s) => show(s.phone) },
  { label: "Email", get: (s) => show(s.email) },
  { label: "Мин. заказ", get: (s) => show(s.moq_text) },
  { label: "Производитель", get: (s) => s.own_production, bool: true },
  { label: "Мелкий опт", get: (s) => s.wholesale_small, bool: true },
  { label: "Отсрочка", get: (s) => s.deferred_payment, bool: true },
  { label: "Для общепита", get: (s) => s.horeca, bool: true },
  { label: "Халяль", get: (s) => s.halal, bool: true },
  { label: "Своя доставка", get: (s) => s.delivery_own_transport, bool: true },
  { label: "Самовывоз", get: (s) => s.delivery_pickup, bool: true },
  { label: "По России", get: (s) => s.delivery_russia, bool: true },
  { label: "Документы", get: (s) => show(s.docs) },
  { label: "ЭДО", get: (s) => s.edo, bool: true },
];

function CompareCell({ row, supplier }) {
  if (row.bool) {
    const v = row.get(supplier);
    if (v === true) return <td className="compare-yes">✓ Да</td>;
    if (v === false) return <td className="compare-no">— Нет</td>;
    return <td className="na">{NA}</td>;
  }
  const val = row.get(supplier);
  const na = val === NA;
  return <td className={na ? "na" : ""}>{val}</td>;
}

export function CompareModal({ suppliers, onClose, onRemove, onOpenDetail }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Сравнение поставщиков</div>
            <div className="modal-subtitle">
              {suppliers.length} из 3 · нажмите на название, чтобы открыть карточку
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        {suppliers.length === 0 ? (
          <div className="compare-empty">
            Список сравнения пуст.
            <br />
            Откройте карточку поставщика и нажмите «⊕ К сравнению».
          </div>
        ) : (
          <div className="modal-body compare-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th className="row-label"></th>
                  {suppliers.map((s) => (
                    <th key={s.id} className="compare-col-head">
                      <span
                        className="compare-col-name"
                        onClick={() => onOpenDetail(s.id)}
                      >
                        {s.name}
                      </span>
                      <button
                        className="compare-col-x"
                        onClick={() => onRemove(s.id)}
                        aria-label="Убрать из сравнения"
                      >
                        ✕
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td className="row-label">{row.label}</td>
                    {suppliers.map((s) => (
                      <CompareCell key={s.id} row={row} supplier={s} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
