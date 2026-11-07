const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');

const app = express();
const PORT = 5000;

const FRONTEND_ORIGIN =
  process.env.FRONTEND_URL || String.fromCharCode(104,116,116,112,58,47,47,108,111,99,97,108,104,111,115,116,58,53,49,55,51);

app.use(cors({
  origin: (requestOrigin, callback) => {
    if (!requestOrigin || requestOrigin === FRONTEND_ORIGIN) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
}));
app.use(express.json());

// Fixed doctor list
const doctors = [
  { id: 'dr-ali', name: 'Dr. Ali', specialty: 'Cardiology' },
  { id: 'dr-sara', name: 'Dr. Sara', specialty: 'General Medicine' },
  { id: 'dr-usman', name: 'Dr. Usman', specialty: 'Pediatrics' },
];

// In-memory appointment storage
const appointments = [];

const VALID_DURATIONS = [15, 30, 45];
const VALID_STATUSES = ['Booked', 'Completed', 'Cancelled'];

const CLINIC_START = 9 * 60;
const CLINIC_END = 17 * 60;

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function findDoctor(doctorId) {
  return doctors.find((doctor) => doctor.id === doctorId);
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(`${date}T12:00:00`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function validateAppointment(data) {
  const {
    doctorId,
    patientName,
    patientPhone,
    date,
    startTime,
    duration,
  } = data;

  if (!findDoctor(doctorId)) {
    return 'Please select a valid doctor.';
  }

  if (
    typeof patientName !== 'string' ||
    patientName.trim().length === 0
  ) {
    return 'Patient name is required.';
  }

  if (
    typeof patientPhone !== 'string' ||
    !/^\d{10,13}$/.test(patientPhone)
  ) {
    return 'Phone number must contain 10 to 13 digits.';
  }

  if (!isValidDate(date)) {
    return 'Please provide a valid date in YYYY-MM-DD format.';
  }

  if (
    typeof startTime !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)
  ) {
    return 'Please provide a valid start time in HH:mm format.';
  }

  if (!VALID_DURATIONS.includes(Number(duration))) {
    return 'Duration must be 15, 30, or 45 minutes.';
  }

  const appointmentStart = timeToMinutes(startTime);
  const appointmentEnd = appointmentStart + Number(duration);

  if (
    appointmentStart < CLINIC_START ||
    appointmentEnd > CLINIC_END
  ) {
    return 'Appointments must be within clinic hours (9:00 AM to 5:00 PM).';
  }

  // Clinic is open Monday through Saturday.
  // Sunday is closed.
  const day = new Date(`${date}T12:00:00`).getDay();

  if (day === 0) {
    return 'The clinic is closed on Sundays.';
  }

  const appointmentDateTime = new Date(`${date}T${startTime}:00`);

  if (appointmentDateTime <= new Date()) {
    return 'Appointments cannot be booked in the past.';
  }

  return null;
}

function hasOverlap(doctorId, date, startTime, duration, excludeId = null) {
  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + Number(duration);

  return appointments.some((appointment) => {
    if (
      appointment.id === excludeId ||
      appointment.doctorId !== doctorId ||
      appointment.date !== date ||
      appointment.status !== 'Booked'
    ) {
      return false;
    }

    const existingStart = timeToMinutes(appointment.startTime);
    const existingEnd = existingStart + appointment.duration;

    return newStart < existingEnd && newEnd > existingStart;
  });
}

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'Appointment Booking API is running',
  });
});

// Get doctors
app.get('/api/doctors', (req, res) => {
  res.json(doctors);
});

// Get appointments with optional filters
app.get('/api/appointments', (req, res) => {
  const { doctor, date, status } = req.query;

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesDoctor =
      !doctor ||
      appointment.doctorId === doctor ||
      appointment.doctorName.toLowerCase() === doctor.toLowerCase();

    const matchesDate = !date || appointment.date === date;
    const matchesStatus =
      !status ||
      appointment.status.toLowerCase() === status.toLowerCase();

    return matchesDoctor && matchesDate && matchesStatus;
  });

  res.json(filteredAppointments);
});

// Get available 30-minute slots
app.get('/api/appointments/available-slots', (req, res) => {
  const { doctor, date } = req.query;

  if (!findDoctor(doctor)) {
    return sendError(res, 400, 'Please provide a valid doctor ID.');
  }

  if (!isValidDate(date)) {
    return sendError(res, 400, 'Please provide a valid date (YYYY-MM-DD).');
  }

  const day = new Date(`${date}T12:00:00`).getDay();

  if (day === 0) {
    return sendError(res, 400, 'The clinic is closed on Sundays.');
  }

  const slots = [];

  for (
    let start = CLINIC_START;
    start + 30 <= CLINIC_END;
    start += 30
  ) {
    const hours = String(Math.floor(start / 60)).padStart(2, '0');
    const minutes = String(start % 60).padStart(2, '0');
    const startTime = `${hours}:${minutes}`;
    const slotDateTime = new Date(`${date}T${startTime}:00`);

    if (slotDateTime <= new Date()) {
      continue;
    }

    if (!hasOverlap(doctor, date, startTime, 30)) {
      slots.push(startTime);
    }
  }

  res.json(slots);
});

// Book an appointment
app.post('/api/appointments', (req, res) => {
  const validationError = validateAppointment(req.body);

  if (validationError) {
    return sendError(res, 400, validationError);
  }

  const {
    doctorId,
    patientName,
    patientPhone,
    date,
    startTime,
    duration,
    reason,
  } = req.body;

  if (
    hasOverlap(doctorId, date, startTime, Number(duration))
  ) {
    return sendError(
      res,
      400,
      'This doctor already has an appointment during the selected time.'
    );
  }

  const doctor = findDoctor(doctorId);

  const appointment = {
    id: randomUUID(),
    doctorId,
    doctorName: doctor.name,
    patientName: patientName.trim(),
    patientPhone,
    date,
    startTime,
    duration: Number(duration),
    reason: typeof reason === 'string' ? reason.trim() : '',
    status: 'Booked',
    createdAt: new Date().toISOString(),
  };

  appointments.push(appointment);

  res.status(201).json({
    message: 'Appointment booked successfully.',
    appointment,
  });
});

// Get one appointment
app.get('/api/appointments/:id', (req, res) => {
  const appointment = appointments.find(
    (item) => item.id === req.params.id
  );

  if (!appointment) {
    return sendError(res, 404, 'Appointment not found.');
  }

  res.json(appointment);
});

// Cancel or complete an appointment
app.patch('/api/appointments/:id', (req, res) => {
  const appointment = appointments.find(
    (item) => item.id === req.params.id
  );

  if (!appointment) {
    return sendError(res, 404, 'Appointment not found.');
  }

  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return sendError(
      res,
      400,
      'Status must be Booked, Completed, or Cancelled.'
    );
  }

  if (appointment.status !== 'Booked') {
    return sendError(
      res,
      400,
      'A completed or cancelled appointment cannot be changed again.'
    );
  }

  if (status === 'Booked') {
    return sendError(
      res,
      400,
      'An appointment cannot be changed back to Booked.'
    );
  }

  appointment.status = status;

  res.json({
    message: `Appointment ${status.toLowerCase()} successfully.`,
    appointment,
  });
});

// Handle unknown routes
app.use((req, res) => {
  sendError(res, 404, 'Route not found.');
});

// Handle invalid JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 400, 'Invalid JSON request body.');
  }

  next(err);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
