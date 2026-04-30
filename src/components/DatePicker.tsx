import React, { useEffect, useRef, useState } from 'react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  max?: string;
  min?: string;
}

const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month, 0).getDate();

const parseIso = (iso: string) => {
  if (!iso) return { day: '', month: '', year: '' };
  const [year, month, day] = iso.split('-');
  return {
    day: day || '',
    month: month || '',
    year: year || '',
  };
};

const buildIsoIfValid = (
  day: string,
  month: string,
  year: string
): string | null => {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return null;

  const d = Number(day);
  const m = Number(month);
  const y = Number(year);

  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > getDaysInMonth(y, m)) return null;

  return `${y}-${pad2(m)}-${pad2(d)}`;
};

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, max, min }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const [{ day, month, year }, setParts] = useState(parseIso(value));
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    };
  });

  useEffect(() => {
    setParts(parseIso(value));
    if (value) {
      const d = new Date(value);
      setCalendarDate({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
      });
    }
  }, [value]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const emitIfValid = (nextDay: string, nextMonth: string, nextYear: string) => {
    const iso = buildIsoIfValid(nextDay, nextMonth, nextYear);
    if (!iso) return;

    if (min && iso < min) return;
    if (max && iso > max) return;

    onChange(iso);
  };

  const setAndEmit = (next: { day?: string; month?: string; year?: string }) => {
    const nextDay = next.day ?? day;
    const nextMonth = next.month ?? month;
    const nextYear = next.year ?? year;

    setParts({
      day: nextDay,
      month: nextMonth,
      year: nextYear,
    });

    emitIfValid(nextDay, nextMonth, nextYear);
  };

  const onlyDigits = (v: string) => v.replace(/\D/g, '');

  const handlePartChange = (
    part: 'day' | 'month' | 'year',
    rawValue: string,
    maxLength: number,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    const clean = onlyDigits(rawValue).slice(0, maxLength);

    setAndEmit({ [part]: clean });

    if (clean.length === maxLength && nextRef?.current) {
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

  const handlePartKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    prevRef?: React.RefObject<HTMLInputElement | null>,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    const input = e.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;

    if (e.key === 'ArrowLeft' && start === 0 && end === 0 && prevRef?.current) {
      prevRef.current.focus();
      const len = prevRef.current.value.length;
      prevRef.current.setSelectionRange(len, len);
      return;
    }

    if (
      e.key === 'ArrowRight' &&
      start === currentValue.length &&
      end === currentValue.length &&
      nextRef?.current
    ) {
      nextRef.current.focus();
      nextRef.current.setSelectionRange(0, 0);
      return;
    }

    if (e.key === 'Backspace' && currentValue.length === 0 && prevRef?.current) {
      prevRef.current.focus();
      const len = prevRef.current.value.length;
      prevRef.current.setSelectionRange(len, len);
      e.preventDefault();
      return;
    }

    if (e.key === 'Enter') {
      input.blur();
    }
  };

  const handleBlurValidate = () => {
    const iso = buildIsoIfValid(day, month, year);

    if (!iso) {
      setParts(parseIso(value));
      return;
    }

    if (min && iso < min) {
      setParts(parseIso(value));
      return;
    }

    if (max && iso > max) {
      setParts(parseIso(value));
      return;
    }

    onChange(iso);
    setParts(parseIso(iso));
  };

  const renderCalendar = () => {
    const { year, month } = calendarDate;

    const firstDay = new Date(year, month - 1, 1).getDay();
    const startOffset = (firstDay + 6) % 7;
    const daysInMonth = getDaysInMonth(year, month);

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(
      today.getDate()
    )}`;

    const cells: (number | null)[] = [
      ...Array(startOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    while (cells.length % 7 !== 0) cells.push(null);

    const handleSelectDay = (dayNumber: number) => {
      const iso = `${year}-${pad2(month)}-${pad2(dayNumber)}`;

      if (min && iso < min) return;
      if (max && iso > max) return;

      onChange(iso);
      setParts(parseIso(iso));
      setShowCalendar(false);
    };

    return (
      <div
        onMouseDown={e => e.preventDefault()}
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: 4,
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: 8,
          boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
          padding: 12,
          zIndex: 3000,
          minWidth: 280,
          userSelect: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <button
            type="button"
            onClick={() =>
              setCalendarDate(prev =>
                prev.month === 1
                  ? { year: prev.year - 1, month: 12 }
                  : { ...prev, month: prev.month - 1 }
              )
            }
            style={calBtnSt}
          >
            ‹
          </button>

          <div style={{ display: 'flex', gap: 6 }}>
            <select
              value={month}
              onChange={e =>
                setCalendarDate(prev => ({ ...prev, month: Number(e.target.value) }))
              }
              style={calSelSt}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={e =>
                setCalendarDate(prev => ({ ...prev, year: Number(e.target.value) }))
              }
              style={calSelSt}
            >
              {Array.from({ length: 151 }, (_, i) => 1950 + i).map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() =>
              setCalendarDate(prev =>
                prev.month === 12
                  ? { year: prev.year + 1, month: 1 }
                  : { ...prev, month: prev.month + 1 }
              )
            }
            style={calBtnSt}
          >
            ›
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2,
            marginBottom: 4,
          }}
        >
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 'bold',
                color: '#777',
                padding: '4px 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2,
          }}
        >
          {cells.map((dayNumber, i) => {
            if (!dayNumber) return <div key={i} />;

            const iso = `${year}-${pad2(month)}-${pad2(dayNumber)}`;
            const selected = iso === value;
            const isToday = iso === `${new Date().getFullYear()}-${pad2(new Date().getMonth() + 1)}-${pad2(new Date().getDate())}`;
            const disabled = !!((min && iso < min) || (max && iso > max));
            const isWeekend = i % 7 >= 5;

            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => handleSelectDay(dayNumber)}
                style={{
                  border: selected
                    ? '2px solid #1976D2'
                    : isToday
                    ? '1px solid #90caf9'
                    : '1px solid transparent',
                  background: selected ? '#1976D2' : '#fff',
                  color: disabled
                    ? '#ccc'
                    : selected
                    ? '#fff'
                    : isWeekend
                    ? '#d32f2f'
                    : '#222',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontWeight: isToday ? 'bold' : 'normal',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  padding: 0,
                  fontSize: 13,
                }}
              >
                {dayNumber}
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 10,
            borderTop: '1px solid #eee',
            paddingTop: 8,
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => {
              const t = new Date();
              const iso = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(
                t.getDate()
              )}`;

              if (min && iso < min) return;
              if (max && iso > max) return;

              onChange(iso);
              setParts(parseIso(iso));
              setCalendarDate({
                year: t.getFullYear(),
                month: t.getMonth() + 1,
              });
              setShowCalendar(false);
            }}
            style={{
              background: 'none',
              border: '1px solid #1976D2',
              color: '#1976D2',
              borderRadius: 4,
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Сегодня
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'stretch' }}
      onClick={e => e.stopPropagation()}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1px solid #ccc',
          borderRadius: 4,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 2,
            paddingRight: 2,
            height: 28,
          }}
        >
          <input
            ref={dayRef}
            type="text"
            inputMode="numeric"
            value={day}
            placeholder="ДД"
            onChange={e => handlePartChange('day', e.target.value, 2, monthRef)}
            onKeyDown={e => handlePartKeyDown(e, day, undefined, monthRef)}
            onBlur={handleBlurValidate}
            style={segmentInputStyle(20)}
          />

          <span style={dotStyle}>.</span>

          <input
            ref={monthRef}
            type="text"
            inputMode="numeric"
            value={month}
            placeholder="ММ"
            onChange={e => handlePartChange('month', e.target.value, 2, yearRef)}
            onKeyDown={e => handlePartKeyDown(e, month, dayRef, yearRef)}
            onBlur={handleBlurValidate}
            style={segmentInputStyle(20)}
          />

          <span style={dotStyle}>.</span>

          <input
            ref={yearRef}
            type="text"
            inputMode="numeric"
            value={year}
            placeholder="ГГГГ"
            onChange={e => handlePartChange('year', e.target.value, 4)}
            onKeyDown={e => handlePartKeyDown(e, year, monthRef)}
            onBlur={handleBlurValidate}
            style={segmentInputStyle(36)}
          />
        </div>

        <button
          type="button"
          onClick={() => setShowCalendar(prev => !prev)}
          style={{
            background: '#f5f5f5',
            border: 'none',
            borderLeft: '1px solid #ccc',
            padding: '0 6px',
            cursor: 'pointer',
            fontSize: 14,
            height: 28,
            display: 'flex',
            alignItems: 'center',
          }}
          title="Открыть календарь"
        >
          📅
        </button>
      </div>

      {showCalendar && renderCalendar()}
    </div>
  );
};

const segmentInputStyle = (width: number): React.CSSProperties => ({
  width,
  border: 'none',
  outline: 'none',
  textAlign: 'center',
  fontSize: 14,
  lineHeight: '14px',
  background: 'transparent',
  padding: '4px 0',
  margin: 0,
});

const dotStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '4px',
  margin: '0 -1px',
  fontSize: 14,
  lineHeight: 1,
  color: '#555',
  userSelect: 'none',
  position: 'relative',
  top: '-1px',
};

const calBtnSt: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 20,
  padding: '2px 8px',
  color: '#555',
};

const calSelSt: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 4,
  padding: '2px 4px',
  fontSize: 13,
  cursor: 'pointer',
};

export default DatePicker;