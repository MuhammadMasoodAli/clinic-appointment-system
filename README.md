# CarePoint — Clinic Appointment System

A clinic appointment booking application built with React and Node.js.

## Features

- View three doctors and their specialties.
- Book appointments with doctors.
- Validate patient information and phone numbers.
- Prevent past and overlapping appointments.
- Enforce clinic hours: Monday–Saturday, 9 AM–5 PM.
- Keep Sunday closed.
- Cancel or complete appointments.
- Filter and manage appointment records.
- Prevent modification of completed or cancelled appointments.

## Technologies Used

**Frontend:** React, Vite, Axios, CSS.

**Backend:** Node.js, Express.js, CORS.

## Project Structure

    clinic-appointment-system/
    ├── backend/
    │   ├── server.js
    │   ├── package.json
    │   └── package-lock.json
    ├── frontend/
    │   ├── src/
    │   ├── public/
    │   ├── index.html
    │   ├── package.json
    │   └── package-lock.json
    └── README.md

## Requirements

- Node.js
- npm

## Installation

Clone the repository:

    git clone https://github.com/MuhammadMasoodAli/clinic-appointment-system.git
    cd clinic-appointment-system

### Start Backend

Open a terminal:

    cd backend
    npm install
    npm run dev

Backend URL: http://localhost:5000

### Start Frontend

Open another terminal:

    cd frontend
    npm install
    npm run dev

Frontend URL: http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | / | Health check |
| GET | /api/doctors | Get doctors |
| GET | /api/appointments | Get appointments |
| GET | /api/appointments/available-slots | Get available slots |
| POST | /api/appointments | Book appointment |
| GET | /api/appointments/:id | Get appointment |
| PATCH | /api/appointments/:id | Cancel or complete appointment |

## Doctors

| Doctor | Specialty |
|---|---|
| Dr. Ali | Cardiology |
| Dr. Sara | General Medicine |
| Dr. Usman | Pediatrics |

## Clinic Hours

- Monday–Saturday: 9 AM–5 PM
- Sunday: Closed

Supported appointment durations: 15, 30, and 45 minutes.

## Validation

The backend validates appointment details, prevents overlapping bookings, and returns appropriate HTTP error responses, including 400 and 404.

## Project Status

### Completed
- Backend REST API.
- Appointment booking and validation.
- Appointment cancellation and completion.
- Available time slots.
- Frontend appointment management.
- Frontend/backend integration.

### Unfinished
- No known unfinished assignment requirements.

### Limitations
Appointments are stored in memory and are cleared whenever the backend restarts.

### Future Improvements
- Add permanent database storage.
- Add authentication and user roles.
- Add appointment notifications.
- Improve calendar management.
