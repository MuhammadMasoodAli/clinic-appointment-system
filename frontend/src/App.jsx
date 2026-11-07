import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000/api';

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const initialForm = {
  doctorId: '',
  patientName: '',
  patientPhone: '',
  date: today(),
  startTime: '',
  duration: '30',
  reason: '',
};

function App() {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [slotError, setSlotError] = useState('');

  const loadAppointments = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/appointments`);
      setAppointments(response.data);
    } catch {
      setError('Could not load appointments. Please check the backend server.');
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [doctorsResponse, appointmentsResponse] = await Promise.all([
          axios.get(`${API_URL}/doctors`),
          axios.get(`${API_URL}/appointments`),
        ]);

        setDoctors(doctorsResponse.data);
        setAppointments(appointmentsResponse.data);
        setError('');
      } catch {
        setError('Could not connect to the backend. Make sure it is running on port 5000.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    const loadSlots = async () => {
      if (!form.doctorId || !form.date) {
        setAvailableSlots([]);
        setSlotError('');
        return;
      }

      setAvailableSlots([]);
      setSlotError('');
      setForm((current) => ({ ...current, startTime: '' }));

      try {
        const response = await axios.get(
          `${API_URL}/appointments/available-slots`,
          {
            params: {
              doctor: form.doctorId,
              date: form.date,
            },
          }
        );

        setAvailableSlots(response.data);
      } catch (err) {
        setSlotError(
          err.response?.data?.error || 'Could not load available time slots.'
        );
      }
    };

    loadSlots();
  }, [form.doctorId, form.date]);

  const updateForm = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setMessage('');
    setError('');
  };

  const handleBooking = async (event) => {
    event.preventDefault();

    setMessage('');
    setError('');
    setBooking(true);

    try {
      const response = await axios.post(`${API_URL}/appointments`, {
        ...form,
        duration: Number(form.duration),
      });

      setMessage(response.data.message);
      setForm({
        ...initialForm,
        date: form.date,
        doctorId: form.doctorId,
      });

      await loadAppointments();

      const slotsResponse = await axios.get(
        `${API_URL}/appointments/available-slots`,
        {
          params: {
            doctor: form.doctorId,
            date: form.date,
          },
        }
      );

      setAvailableSlots(slotsResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Something went wrong while booking the appointment.'
      );
    } finally {
      setBooking(false);
    }
  };

  const updateAppointmentStatus = async (id, status) => {
    setMessage('');
    setError('');

    try {
      const response = await axios.patch(
        `${API_URL}/appointments/${id}`,
        { status }
      );

      setMessage(response.data.message || `Appointment ${status.toLowerCase()}.`);
      await loadAppointments();

      if (form.doctorId && form.date) {
        const slotsResponse = await axios.get(
          `${API_URL}/appointments/available-slots`,
          {
            params: {
              doctor: form.doctorId,
              date: form.date,
            },
          }
        );

        setAvailableSlots(slotsResponse.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Could not update the appointment.'
      );
    }
  };

  const filteredAppointments = appointments.filter((appointment) => {
    return filter === 'All' || appointment.status === filter;
  });

  const formatDate = (date) => {
    return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;

    return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  if (loading) {
    return <div className="loading-screen">Loading appointment system...</div>;
  }

  return (
    <main className="app-container">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-icon">+</span>
          <span>CarePoint</span>
        </a>
        <span className="clinic-label">Clinic Appointment System</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">WELCOME TO CAREPOINT</p>
          <h1>Manage your clinic appointments.</h1>
          <p className="hero-description">
            Book appointments with our doctors and keep track of your visits.
          </p>
        </div>
        <div className="hero-icon">✚</div>
      </section>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <section className="content-grid">
        <div className="panel booking-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NEW VISIT</p>
              <h2>Book an appointment</h2>
            </div>
            <span className="heading-icon">＋</span>
          </div>

          <form onSubmit={handleBooking}>
            <div className="form-group">
              <label htmlFor="patientName">Patient name</label>
              <input
                id="patientName"
                name="patientName"
                type="text"
                placeholder="Enter patient's full name"
                value={form.patientName}
                onChange={updateForm}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="patientPhone">Phone number</label>
              <input
                id="patientPhone"
                name="patientPhone"
                type="tel"
                placeholder="03001234567"
                value={form.patientPhone}
                onChange={updateForm}
                pattern="[0-9]{10,13}"
                title="Enter 10 to 13 digits without spaces."
                required
              />
              <small>Enter 10 to 13 digits without spaces.</small>
            </div>

            <div className="form-group">
              <label htmlFor="doctorId">Select doctor</label>
              <select
                id="doctorId"
                name="doctorId"
                value={form.doctorId}
                onChange={updateForm}
                required
              >
                <option value="">Choose a doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} — {doctor.specialty}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="date">Appointment date</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  min={today()}
                  value={form.date}
                  onChange={updateForm}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="duration">Duration</label>
                <select
                  id="duration"
                  name="duration"
                  value={form.duration}
                  onChange={updateForm}
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="startTime">Available time</label>
              <select
                id="startTime"
                name="startTime"
                value={form.startTime}
                onChange={updateForm}
                disabled={!form.doctorId || availableSlots.length === 0}
                required
              >
                <option value="">Select a time slot</option>
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatTime(slot)}
                  </option>
                ))}
              </select>

              {slotError && <small className="field-error">{slotError}</small>}
              {!slotError &&
                form.doctorId &&
                availableSlots.length === 0 && (
                  <small>No available slots for this date.</small>
                )}
            </div>

            <div className="form-group">
              <label htmlFor="reason">Reason for visit (optional)</label>
              <textarea
                id="reason"
                name="reason"
                placeholder="Briefly describe the reason for your visit"
                value={form.reason}
                onChange={updateForm}
                rows="3"
              />
            </div>

            <div className="clinic-note">
              <span>ℹ</span>
              <p>
                Clinic hours: Monday–Saturday, 9:00 AM–5:00 PM.
                Closed on Sundays.
              </p>
            </div>

            <button
              className="primary-button"
              type="submit"
              disabled={booking}
            >
              {booking ? 'Booking...' : 'Confirm appointment'}
            </button>
          </form>
        </div>

        <div className="right-column">
          <section className="panel doctors-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">OUR SPECIALISTS</p>
                <h2>Meet our doctors</h2>
              </div>
            </div>

            <div className="doctor-list">
              {doctors.map((doctor, index) => (
                <div className="doctor-item" key={doctor.id}>
                  <div className={`doctor-avatar avatar-${index}`}>
                    {doctor.name.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <h3>{doctor.name}</h3>
                    <p>{doctor.specialty}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel hours-panel">
            <p className="eyebrow">PLAN YOUR VISIT</p>
            <h2>Clinic hours</h2>
            <div className="hours-row">
              <span>Monday – Saturday</span>
              <strong>9 AM – 5 PM</strong>
            </div>
            <div className="hours-row closed">
              <span>Sunday</span>
              <strong>Closed</strong>
            </div>
          </section>
        </div>
      </section>

      <section className="panel appointments-panel">
        <div className="appointments-header">
          <div>
            <p className="eyebrow">APPOINTMENT RECORDS</p>
            <h2>Manage appointments</h2>
            <p className="muted-text">
              View and update your appointment records.
            </p>
          </div>

          <div className="appointment-count">
            <strong>{appointments.length}</strong>
            <span>Total visits</span>
          </div>
        </div>

        <div className="filter-row">
          {['All', 'Booked', 'Completed', 'Cancelled'].map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-button ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status}
              {status === 'All' && ` (${appointments.length})`}
            </button>
          ))}
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">▤</div>
            <h3>No appointments found</h3>
            <p>
              {filter === 'All'
                ? 'Appointments you book will appear here.'
                : `There are no ${filter.toLowerCase()} appointments.`}
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Date & time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>
                      <strong>{appointment.patientName}</strong>
                      <small>{appointment.patientPhone}</small>
                    </td>
                    <td>
                      <strong>{appointment.doctorName}</strong>
                    </td>
                    <td>
                      <strong>{formatDate(appointment.date)}</strong>
                      <small>{formatTime(appointment.startTime)}</small>
                    </td>
                    <td>{appointment.duration} min</td>
                    <td>
                      <span
                        className={`status-badge status-${appointment.status.toLowerCase()}`}
                      >
                        {appointment.status}
                      </span>
                    </td>
                    <td>
                      {appointment.status === 'Booked' ? (
                        <div className="action-buttons">
                          <button
                            className="complete-button"
                            type="button"
                            onClick={() =>
                              updateAppointmentStatus(
                                appointment.id,
                                'Completed'
                              )
                            }
                          >
                            Complete
                          </button>
                          <button
                            className="cancel-button"
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Are you sure you want to cancel this appointment?'
                                )
                              ) {
                                updateAppointmentStatus(
                                  appointment.id,
                                  'Cancelled'
                                );
                              }
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span className="muted-text">No actions</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer>
        <span>CarePoint Clinic</span>
        <span>Appointment Booking System</span>
      </footer>
    </main>
  );
}

export default App;
