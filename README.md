<div align="center">
  <img src="frontend/public/smartparklogo-clear.png" alt="SmartPark Logo" width="200" height="auto" />
  <h1>SmartPark v5</h1>
  <p><strong>Intelligent Parking Management System using IoT & Computer Vision</strong></p>

  <h3>Authors</h3>
  <p><strong>Pratham Yadav and Collaboration on project with Kalepu Yashavardhan</strong></p>

  <br />
</div>

## 📖 Overview

**SmartPark v5** is a state-of-the-art parking management solution that integrates hardware sensors (ESP32/Raspberry Pi) with a modern web interface to provide real-time parking availability, seamless slot booking, and intelligent invalid slot navigation.

The system features a **Dynamic Floor Plan** that visually guides users to their slots and offers features like "Navigate to Closest" and cross-level redirection when floors are full.

## ✨ Key Features

- **Real-Time Monitoring**: Ultrasonic sensors track slot occupancy efficiently.
- **Smart Booking System**:
  - Book slots for **Today** or **Tomorrow**.
  - Supports multiple bookings per user.
  - Conflict detection prevents double-booking.
- **Interactive Floor Plan**:
  - Live visualization of Free, Occupied, and Booked slots.
  - **A* Pathfinding Navigation**: Visual path from entry to your specific slot.
  - **Auto-Redirection**: Suggests Level 2 if Level 1 is full.
- **Role-Based Access**:
  - **Normal Users**: Standard access.
  - **Disabled / Elderly**: Exclusive access to reserved premium slots close to the entrance.
- **Bidirectional Hardware Control**:
  - Booked slots light up physically (LED indicators) on the parking site.

---

## 🛠 Tech Stack

### Software
- **Frontend**: React.js, Vite, GSAP (Animations), Canvas API.
- **Backend**: FastAPI (Python), Pydantic.
- **Database**: In-memory store (for demo performance) / Extensible to SQL.
- **Communication**: REST API (JSON).

### Hardware
- **Controllers**: Raspberry Pi 4 (Main Server/Gateway), ESP32 (Sensor Node).
- **Sensors**: HC-SR04 Ultrasonic Sensors.
- **Indicators**: LEDs (Green/Red for availability/booking status).
- **Communication PROTOCOL**: HTTP over WiFi using ArduinoJson.

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.9+
- Node.js & npm
- Raspberry Pi (optional, for hardware deployment)
- ESP32 Board (for Mall 2 simulation)

### 1. Clone the Repository
```bash
git clone https://github.com/YourRepo/SmartPark.git
cd SmartPark/smartparkv5
```

### 2. Backend Setup
The backend runs on FastAPI and handles all logic.
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Frontend Setup
The frontend is built with React + Vite.
```bash
cd frontend
npm install
cd ..
```

### 4. Running the Development Server
We have provided a unified script to run both backend and frontend.
```bash
chmod +x run_dev.sh
./run_dev.sh
```
- **Backend**: `http://localhost:8000`
- **Frontend**: `http://localhost:5173`

---

## 🔌 Hardware Configuration

### Pinout Configuration

#### **Raspberry Pi (Mall 1)**
- **Slot 1 (HC-SR04)**: Trig `GPIO 23`, Echo `GPIO 24`
- **Slot 2 (HC-SR04)**: Trig `GPIO 27`, Echo `GPIO 22`
- **Slot 3 (HC-SR04)**: Trig `GPIO 5`, Echo `GPIO 6`
- **Slot 4 (HC-SR04)**: Trig `GPIO 13`, Echo `GPIO 19`

#### **ESP32 (Mall 2 - Wireless Node)**
The ESP32 communicates wirelessly with the Main Server.

- **WiFi Config**: Update `ssid` and `password` in `firmware/smartpark_esp32/smartpark_esp32.ino`.
- **Sensors**:
  - S1: Trig `13`, Echo `33`
  - S2: Trig `12`, Echo `32`
  - S3: Trig `14`, Echo `35`
  - S4: Trig `27`, Echo `34`
- **LEDs (Booking Indicators)**:
  - S1 LED: Pin `25`
  - S2 LED: Pin `26`

### Firmware Upload
1. Open `firmware/smartpark_esp32/smartpark_esp32.ino` in Arduino IDE.
2. Select Board: **AI Thinker ESP32-CAM** or **DOIT ESP32 DEVKIT V1**.
3. Verify the `serverUrl` matches your computer/Pi IP address.
4. Upload!

---

## 📱 User Guide

1. **Dashboard**: Select a Mall (Mall 1 or Mall 2).
2. **Booking**: Click any "Free" slot (Green) -> Select "Today" or "Tomorrow" -> Confirm.
3. **Navigation**: Click **"Navigate"** on your booked slot to see the path.
4. **Smart Nav**: Click **"Navigate to Closest"** at the top to automatically find the nearest best slot for you.

---

## 📸 Visuals

![Floor Plan](floorplan.png)

---

<div align="center">
  <p>Currently maintained by Pratham Yadav</p>
</div>
