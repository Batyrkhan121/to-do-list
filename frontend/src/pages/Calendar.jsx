import { useEffect, useMemo, useState } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import Modal from '../components/Modal';
import { PageTransition } from '../components/animations/PageTransition';
import {
  useCalendarEvents,
  useCompleteTask,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useTasks,
  useUpdateCalendarEvent,
} from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: { 'en-US': enUS },
});

const DnDCalendar = withDragAndDrop(BigCalendar);

const VIEW_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'work_week', label: 'Work week' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'agenda', label: 'Agenda' },
];
const hexToRgba = (hex, alpha) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  if (Number.isNaN(bigint)) return `rgba(37, 99, 235, ${alpha})`;
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const darkenHex = (hex, amount = 0.2) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  if (Number.isNaN(bigint)) return '#1e40af';
  const r = Math.max(0, Math.floor(((bigint >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.floor(((bigint >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.floor((bigint & 255) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const parseTaskDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  if (typeof value === 'string' && value.length <= 10) {
    parsed.setHours(9, 0, 0, 0);
  }
  return parsed;
};

const buildDateTime = (dateStr, timeStr) => {
  const base = parse(dateStr, 'yyyy-MM-dd', new Date());
  if (Number.isNaN(base.getTime())) return null;
  const [hours, minutes] = timeStr.split(':').map((value) => Number(value));
  base.setHours(hours || 0, minutes || 0, 0, 0);
  return base;
};

const buildRangeLabel = (date, view) => {
  if (view === 'month') {
    return format(date, 'MMMM yyyy');
  }
  if (view === 'day') {
    return format(date, 'MMM d, yyyy');
  }
  if (view === 'agenda') {
    return format(date, 'MMM d, yyyy');
  }
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = addDays(start, view === 'work_week' ? 4 : 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = format(start, sameMonth ? 'MMM d' : 'MMM d');
  const endLabel = format(end, 'MMM d, yyyy');
  return `${startLabel} – ${endLabel}`;
};

function EventCell({ event }) {
  return (
    <div>
      <div className="calendar-event-title">
        {event.isRecurring ? '↻ ' : ''}
        {event.title}
      </div>
      <div className="calendar-event-time">
        {format(event.start, 'p')} – {format(event.end, 'p')}
      </div>
      {event.location && (
        <div className="calendar-event-meta">{event.location}</div>
      )}
    </div>
  );
}
export default function CalendarPage() {
  const { user } = useAuth();
  const syncOptions = {
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  };

  const { data: tasksData, isLoading, error } = useTasks({}, syncOptions);
  const {
    data: calendarEventsData,
    isLoading: isEventsLoading,
  } = useCalendarEvents({}, syncOptions);
  const completeTask = useCompleteTask();
  const createCalendarEvent = useCreateCalendarEvent();
  const updateCalendarEvent = useUpdateCalendarEvent();
  const deleteCalendarEvent = useDeleteCalendarEvent();

  const [date, setDate] = useState(new Date());
  const [view, setView] = useState('work_week');
  const [miniMonth, setMiniMonth] = useState(startOfMonth(new Date()));

  const [calendars, setCalendars] = useState([
    { id: 'my', name: 'My calendar', color: '#2563eb', enabled: true },
    { id: 'holidays', name: 'US Holidays', color: '#16a34a', enabled: true },
  ]);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [eventFormError, setEventFormError] = useState('');
  const [editingEventId, setEditingEventId] = useState(null);
  const [editingEventApiId, setEditingEventApiId] = useState(null);
  const [editingSeriesId, setEditingSeriesId] = useState(null);
  const [applyToSeries, setApplyToSeries] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '09:30',
    calendarId: 'my',
    participants: '',
    location: '',
    description: '',
    recurrence: 'none',
    attachments: [],
  });

  useEffect(() => {
    if (!isSameMonth(date, miniMonth)) {
      setMiniMonth(startOfMonth(date));
    }
  }, [date, miniMonth]);

  const tasks = tasksData?.results || tasksData || [];
  const isCalendarLoading = isLoading || isEventsLoading;
  const calendarEvents = useMemo(() => {
    const items = Array.isArray(calendarEventsData)
      ? calendarEventsData
      : calendarEventsData?.results || [];
    return items
      .map((event) => {
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return null;
        }
        return {
          id: `calendar-${event.id}`,
          apiId: event.id,
          title: event.title,
          start,
          end,
          calendarId: event.calendar_id || 'my',
          color: event.color || '#2563eb',
          source: 'calendar',
          description: event.description || '',
          location: event.location || '',
          participants: event.participants || [],
          recurrence: event.recurrence || 'none',
          isRecurring: event.recurrence && event.recurrence !== 'none',
          seriesId: event.series_id || null,
          isAllDay: event.is_all_day || false,
        };
      })
      .filter(Boolean);
  }, [calendarEventsData]);

  const taskEvents = useMemo(() => {
    const priorityColors = {
      low: '#22c55e',
      medium: '#eab308',
      high: '#f97316',
      urgent: '#ef4444',
    };
    return tasks
      .map((task) => {
        const start = parseTaskDate(task.due_date);
        if (!start) return null;
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        const isOwnTask = task.responsible?.id === user?.id;
        return {
          id: `task-${task.id}`,
          title: isOwnTask ? task.title : `Team: ${task.title}`,
          start,
          end,
          calendarId: 'my',
          color: priorityColors[task.priority] || '#2563eb',
          source: 'task',
          taskId: task.id,
          description: task.description,
          isCompleted: task.is_completed,
          isOwnTask,
          isRecurring: false,
          participants: task.responsible?.username ? [task.responsible.username] : [],
          location: task.team_name || '',
        };
      })
      .filter(Boolean);
  }, [tasks, user?.id]);

  const holidayEvents = useMemo(() => {
    const base = startOfMonth(date);
    const holidayDate = addDays(base, 4);
    return [
      {
        id: `holiday-${format(holidayDate, 'yyyy-MM-dd')}`,
        title: 'Team Holiday',
        start: new Date(holidayDate.setHours(0, 0, 0, 0)),
        end: new Date(holidayDate.setHours(23, 59, 0, 0)),
        calendarId: 'holidays',
        color: '#16a34a',
        source: 'holiday',
        isRecurring: true,
      },
    ];
  }, [date]);

  const demoEvents = useMemo(() => {
    if (taskEvents.length || calendarEvents.length) return [];
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const gymStart = addDays(weekStart, 1);
    gymStart.setHours(9, 0, 0, 0);
    const lunchStart = addDays(weekStart, 3);
    lunchStart.setHours(12, 30, 0, 0);
    return [
      {
        id: 'demo-gym',
        title: 'Gym',
        start: new Date(gymStart),
        end: new Date(gymStart.getTime() + 60 * 60 * 1000),
        calendarId: 'my',
        color: '#2563eb',
        source: 'demo',
        isRecurring: true,
        location: 'Pro Sports Club',
      },
      {
        id: 'demo-lunch',
        title: 'Lunch',
        start: new Date(lunchStart),
        end: new Date(lunchStart.getTime() + 60 * 60 * 1000),
        calendarId: 'my',
        color: '#3b82f6',
        source: 'demo',
        location: 'Cafe',
      },
    ];
  }, [calendarEvents.length, date, taskEvents.length]);

  const events = useMemo(() => {
    const activeIds = new Set(calendars.filter((cal) => cal.enabled).map((cal) => cal.id));
    return [...taskEvents, ...calendarEvents, ...holidayEvents, ...demoEvents].filter((event) =>
      activeIds.has(event.calendarId)
    );
  }, [calendars, taskEvents, calendarEvents, holidayEvents, demoEvents]);

  const activeCalendarIds = useMemo(
    () => new Set(calendars.filter((cal) => cal.enabled).map((cal) => cal.id)),
    [calendars]
  );

const createDefaultForm = (baseDate = new Date(), calendarId = 'my') => {
  return {
    title: '',
    date: format(baseDate, 'yyyy-MM-dd'),
    startTime: format(baseDate, 'HH:mm'),
    endTime: format(addMinutes(baseDate, 30), 'HH:mm'),
      calendarId,
      participants: '',
      location: '',
      description: '',
      recurrence: 'none',
      attachments: [],
    };
  };

  const openEventModal = (baseDate = new Date(), existingEvent = null) => {
    if (existingEvent) {
      setEditingEventId(existingEvent.id);
      setEditingEventApiId(existingEvent.apiId || null);
      setEditingSeriesId(existingEvent.seriesId || null);
      setApplyToSeries(false);
      setEventForm({
        title: existingEvent.title,
        date: format(existingEvent.start, 'yyyy-MM-dd'),
        startTime: format(existingEvent.start, 'HH:mm'),
        endTime: format(existingEvent.end, 'HH:mm'),
        calendarId: existingEvent.calendarId,
        participants: Array.isArray(existingEvent.participants)
          ? existingEvent.participants.join(', ')
          : existingEvent.participants || '',
        location: existingEvent.location || '',
        description: existingEvent.description || '',
        recurrence: existingEvent.recurrence || 'none',
        attachments: existingEvent.attachments || [],
      });
    } else {
      setEditingEventId(null);
      setEditingEventApiId(null);
      setEditingSeriesId(null);
      setApplyToSeries(false);
      setEventForm(createDefaultForm(baseDate, calendars[0]?.id || 'my'));
    }
    setEventFormError('');
    setIsEventModalOpen(true);
  };

  const handleNavigate = (direction) => {
    if (direction === 'today') {
      setDate(new Date());
      return;
    }
    if (view === 'month') {
      setDate(addMonths(date, direction === 'next' ? 1 : -1));
      return;
    }
    if (view === 'day') {
      setDate(addDays(date, direction === 'next' ? 1 : -1));
      return;
    }
    setDate(addWeeks(date, direction === 'next' ? 1 : -1));
  };

  const handleSelectSlot = ({ start, end }) => {
    openEventModal(start);
    setEventForm((prev) => ({
      ...prev,
      startTime: format(start, 'HH:mm'),
      endTime: format(end, 'HH:mm'),
    }));
  };

  const handleEventDrop = ({ event, start, end }) => {
    if (event.source !== 'calendar') return;
    if (!event.apiId) return;
    updateCalendarEvent.mutate({
      id: event.apiId,
      data: {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      },
    });
  };

  const handleEventResize = ({ event, start, end }) => {
    if (event.source !== 'calendar') return;
    if (!event.apiId) return;
    updateCalendarEvent.mutate({
      id: event.apiId,
      data: {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      },
    });
  };

  const handleSaveEvent = async (event) => {
    event.preventDefault();
    if (!eventForm.title.trim()) {
      setEventFormError('Title is required');
      return;
    }

    const start = buildDateTime(eventForm.date, eventForm.startTime);
    const end = buildDateTime(eventForm.date, eventForm.endTime);
    if (!start || !end || end <= start) {
      setEventFormError('End time must be later than start time');
      return;
    }

    const calendar = calendars.find((cal) => cal.id === eventForm.calendarId);
    const payload = {
      title: eventForm.title,
      description: eventForm.description,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      calendar_id: eventForm.calendarId,
      color: calendar?.color || '#2563eb',
      location: eventForm.location,
      participants: eventForm.participants
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      recurrence: eventForm.recurrence,
      series_id: editingSeriesId,
      is_all_day: false,
    };

    try {
      if (editingEventApiId) {
        if (applyToSeries && editingSeriesId) {
          const seriesEvents = calendarEvents.filter(
            (item) => item.seriesId === editingSeriesId
          );
          await Promise.all(
            seriesEvents.map((item) =>
              updateCalendarEvent.mutateAsync({
                id: item.apiId,
                data: payload,
              })
            )
          );
        } else {
          await updateCalendarEvent.mutateAsync({
            id: editingEventApiId,
            data: payload,
          });
        }
      } else {
        const seriesId =
          eventForm.recurrence !== 'none' ? `series-${Date.now()}` : null;
        const count =
          eventForm.recurrence === 'daily'
            ? 10
            : eventForm.recurrence === 'weekly'
            ? 8
            : 1;

        const requests = [];
        for (let i = 0; i < count; i += 1) {
          const offsetStart =
            eventForm.recurrence === 'daily'
              ? addDays(start, i)
              : eventForm.recurrence === 'weekly'
              ? addWeeks(start, i)
              : start;
          const offsetEnd =
            eventForm.recurrence === 'daily'
              ? addDays(end, i)
              : eventForm.recurrence === 'weekly'
              ? addWeeks(end, i)
              : end;

          requests.push(
            createCalendarEvent.mutateAsync({
              ...payload,
              start_time: offsetStart.toISOString(),
              end_time: offsetEnd.toISOString(),
              series_id: seriesId,
            })
          );
        }
        await Promise.all(requests);
      }

      setIsEventModalOpen(false);
      setEditingEventId(null);
      setEditingEventApiId(null);
      setEditingSeriesId(null);
    } catch (saveError) {
      setEventFormError('Failed to save event. Try again.');
    }
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    if (selectedEvent.source !== 'calendar') {
      setSelectedEvent(null);
      return;
    }
    const shouldDeleteSeries =
      selectedEvent.seriesId &&
      window.confirm('Delete the whole series? Click Cancel to delete only this event.');
    const deleteTargets = shouldDeleteSeries
      ? calendarEvents.filter((item) => item.seriesId === selectedEvent.seriesId)
      : [selectedEvent];
    deleteTargets.forEach((item) => {
      if (item.apiId) {
        deleteCalendarEvent.mutate(item.apiId);
      }
    });
    setSelectedEvent(null);
  };

  const handleShare = (event) => {
    event.preventDefault();
    setIsShareModalOpen(false);
  };

  const eventStyleGetter = (event, start, end, isSelected) => {
    const color = event.color || '#2563eb';
    const borderColor = darkenHex(color, 0.25);
    return {
      style: {
        backgroundColor: hexToRgba(color, 0.16),
        borderLeft: `4px solid ${borderColor}`,
        color: '#0f172a',
        borderRadius: '6px',
        padding: '4px 8px',
        opacity: event.isCompleted ? 0.6 : 1,
        boxShadow: isSelected
          ? '0 0 0 2px rgba(37, 99, 235, 0.35)'
          : '0 2px 4px rgba(0, 0, 0, 0.05)',
        backdropFilter: 'blur(6px)',
      },
    };
  };

  const miniMonthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(miniMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(miniMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [miniMonth]);

  return (
    <PageTransition>
      <div className="calendar-shell">
        <aside className="calendar-sidebar">
          <div className="mini-calendar">
            <div className="mini-header">
              <button
                className="mini-nav"
                onClick={() => setMiniMonth(subMonths(miniMonth, 1))}
                type="button"
              >
                ‹
              </button>
              <span>{format(miniMonth, 'MMMM yyyy')}</span>
              <button
                className="mini-nav"
                onClick={() => setMiniMonth(addMonths(miniMonth, 1))}
                type="button"
              >
                ›
              </button>
            </div>
            <div className="mini-weekdays">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>
            <div className="mini-days">
              {miniMonthDays.map((day) => {
                const isOutside = !isSameMonth(day, miniMonth);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, date);
                const className = [
                  'mini-day',
                  isOutside ? 'outside' : '',
                  isToday ? 'today' : '',
                  isSelected ? 'selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={className}
                    onClick={() => setDate(day)}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="calendar-section">
            <div className="calendar-section-title">Calendars</div>
            {calendars.map((calendar) => (
              <label
                key={calendar.id}
                className="calendar-item"
                style={{ '--cal-color': calendar.color }}
              >
                <input
                  type="checkbox"
                  checked={calendar.enabled}
                  onChange={() =>
                    setCalendars((prev) =>
                      prev.map((item) =>
                        item.id === calendar.id
                          ? { ...item, enabled: !item.enabled }
                          : item
                      )
                    )
                  }
                />
                <span
                  className="calendar-dot"
                  style={{ backgroundColor: calendar.color }}
                />
                <span>{calendar.name}</span>
              </label>
            ))}
            <button
              className="calendar-link"
              type="button"
              onClick={() => {
                const name = window.prompt('New calendar name');
                if (!name) return;
                const colors = ['#2563eb', '#f97316', '#22c55e', '#a855f7', '#ef4444'];
                const color = colors[Math.floor(Math.random() * colors.length)];
                setCalendars((prev) => [
                  ...prev,
                  {
                    id: `cal-${Date.now()}`,
                    name,
                    color,
                    enabled: true,
                  },
                ]);
              }}
            >
              + New calendar
            </button>
          </div>

          <div className="calendar-section">
            <div className="calendar-section-title">Legend</div>
            <div className="calendar-legend">
              {calendars.map((calendar) => (
                <div key={calendar.id} className="calendar-legend-item">
                  <span
                    className="calendar-dot"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <span>{calendar.name}</span>
                  <span className="calendar-legend-status">
                    {calendar.enabled ? 'On' : 'Off'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="calendar-content">
          <div className="calendar-toolbar">
            <div className="toolbar-group">
              <button
                className="toolbar-btn primary"
                type="button"
                onClick={() => openEventModal(new Date())}
              >
                + New event
              </button>
              <div className="toolbar-segment">
                <button
                  className="toolbar-btn ghost"
                  type="button"
                  onClick={() => handleNavigate('today')}
                >
                  Today
                </button>
                <button
                  className="toolbar-btn ghost"
                  type="button"
                  onClick={() => handleNavigate('prev')}
                >
                  ←
                </button>
                <button
                  className="toolbar-btn ghost"
                  type="button"
                  onClick={() => handleNavigate('next')}
                >
                  →
                </button>
              </div>
              <div className="toolbar-label">{buildRangeLabel(date, view)}</div>
            </div>

            <div className="toolbar-group">
              <select
                className="toolbar-select"
                value={view}
                onChange={(event) => setView(event.target.value)}
              >
                {VIEW_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                className="toolbar-btn"
                type="button"
                onClick={() => setIsShareModalOpen(true)}
              >
                Share
              </button>
            </div>
          </div>

          <div className="calendar-grid">
            {error && (
              <div style={{ marginBottom: '16px', color: '#dc2626' }}>
                Failed to load tasks. Check Django server.
              </div>
            )}
            {isCalendarLoading ? (
              <div
                style={{
                  height: '600px',
                  border: '1px dashed #e5e7eb',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                }}
              >
                Loading calendar...
              </div>
            ) : (
              <DnDCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 720 }}
                view={view}
                date={date}
                onView={setView}
                onNavigate={setDate}
                selectable
                resizable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={(event) => setSelectedEvent(event)}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                eventPropGetter={eventStyleGetter}
                components={{ event: EventCell }}
                draggableAccessor={(event) => event.source === 'calendar'}
                resizableAccessor={(event) => event.source === 'calendar'}
                tooltipAccessor={(event) =>
                  `${format(event.start, 'PPP p')} - ${format(event.end, 'p')}`
                }
                popup
                showNowIndicator
                step={30}
                timeslots={1}
                min={new Date(1970, 1, 1, 7, 0, 0)}
                max={new Date(1970, 1, 1, 21, 0, 0)}
                scrollToTime={new Date(1970, 1, 1, 8, 0, 0)}
                views={VIEW_OPTIONS.map((option) => option.value)}
              />
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={editingEventId ? 'Edit event' : 'New event'}
      >
        <form onSubmit={handleSaveEvent}>
          {eventFormError && (
            <div
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                padding: '10px 12px',
                borderRadius: '10px',
                marginBottom: '12px',
                fontSize: '14px',
              }}
            >
              {eventFormError}
            </div>
          )}

          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Title</label>
              <input
                className="input"
                style={{ width: '100%' }}
                value={eventForm.title}
                onChange={(event) =>
                  setEventForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Meeting title"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Date</label>
                <input
                  type="date"
                  className="input"
                  style={{ width: '100%' }}
                  value={eventForm.date}
                  onChange={(event) =>
                    setEventForm((prev) => ({ ...prev, date: event.target.value }))
                  }
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Calendar</label>
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={eventForm.calendarId}
                  onChange={(event) =>
                    setEventForm((prev) => ({ ...prev, calendarId: event.target.value }))
                  }
                >
                  {calendars.map((calendar) => (
                    <option
                      key={calendar.id}
                      value={calendar.id}
                      disabled={!activeCalendarIds.has(calendar.id)}
                    >
                      {calendar.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Start</label>
                <input
                  type="time"
                  className="input"
                  style={{ width: '100%' }}
                  value={eventForm.startTime}
                  onChange={(event) =>
                    setEventForm((prev) => ({ ...prev, startTime: event.target.value }))
                  }
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>End</label>
                <input
                  type="time"
                  className="input"
                  style={{ width: '100%' }}
                  value={eventForm.endTime}
                  onChange={(event) =>
                    setEventForm((prev) => ({ ...prev, endTime: event.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Participants</label>
              <input
                className="input"
                style={{ width: '100%' }}
                value={eventForm.participants}
                onChange={(event) =>
                  setEventForm((prev) => ({ ...prev, participants: event.target.value }))
                }
                placeholder="Add emails or names"
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Location</label>
              <input
                className="input"
                style={{ width: '100%' }}
                value={eventForm.location}
                onChange={(event) =>
                  setEventForm((prev) => ({ ...prev, location: event.target.value }))
                }
                placeholder="Office, Zoom, etc."
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Description</label>
              <textarea
                className="input"
                style={{ width: '100%', minHeight: '80px' }}
                value={eventForm.description}
                onChange={(event) =>
                  setEventForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Add notes"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Repeat</label>
                <select
                  className="input"
                  style={{ width: '100%' }}
                  value={eventForm.recurrence}
                  onChange={(event) =>
                    setEventForm((prev) => ({ ...prev, recurrence: event.target.value }))
                  }
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Attachments</label>
                <input
                  type="file"
                  className="input"
                  style={{ width: '100%' }}
                  multiple
                  onChange={(event) =>
                    setEventForm((prev) => ({
                      ...prev,
                      attachments: Array.from(event.target.files || []),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {editingEventId && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
              <input
                type="checkbox"
                checked={applyToSeries}
                onChange={(event) => setApplyToSeries(event.target.checked)}
              />
              Apply to series
            </label>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="toolbar-btn"
              onClick={() => setIsEventModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="toolbar-btn primary">
              Save event
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share calendar"
      >
        <form onSubmit={handleShare}>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Invite by email</label>
              <input className="input" style={{ width: '100%' }} placeholder="email@example.com" />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600 }}>Access</label>
              <select className="input" style={{ width: '100%' }}>
                <option value="read">Read only</option>
                <option value="edit">Can edit</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="toolbar-btn" onClick={() => setIsShareModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="toolbar-btn primary">
              Send invite
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Event details"
      >
        {selectedEvent && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ fontSize: '18px', fontWeight: 600 }}>
              {selectedEvent.isRecurring ? '↻ ' : ''}{selectedEvent.title}
            </div>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>
              {format(selectedEvent.start, 'PPP p')} – {format(selectedEvent.end, 'p')}
            </div>
            {selectedEvent.location && (
              <div style={{ fontSize: '14px' }}>Location: {selectedEvent.location}</div>
            )}
            {selectedEvent.description && (
              <div style={{ fontSize: '14px' }}>{selectedEvent.description}</div>
            )}
            {selectedEvent.source === 'task' && (
              <div style={{ fontSize: '14px' }}>
                Task type: {selectedEvent.isOwnTask ? 'My task' : 'Team task'}
              </div>
            )}
            {Array.isArray(selectedEvent.participants) && selectedEvent.participants.length > 0 && (
              <div style={{ fontSize: '14px' }}>
                Participants: {selectedEvent.participants.join(', ')}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {selectedEvent.source === 'task' && !selectedEvent.isCompleted && (
                <button
                  type="button"
                  className="toolbar-btn primary"
                  onClick={() => {
                    completeTask.mutate(selectedEvent.taskId);
                    setSelectedEvent(null);
                  }}
                >
                  Mark complete
                </button>
              )}
              {selectedEvent.source === 'calendar' && (
                <>
                  <button
                    type="button"
                    className="toolbar-btn"
                    onClick={() => {
                      setSelectedEvent(null);
                      openEventModal(selectedEvent.start, selectedEvent);
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="toolbar-btn" onClick={handleDeleteEvent}>
                    Delete
                  </button>
                </>
              )}
              <button
                type="button"
                className="toolbar-btn"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
