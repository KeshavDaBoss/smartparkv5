from fastapi import FastAPI, HTTPException, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import date, datetime, timedelta
import asyncio
import contextlib

from .models import Slot, User, UserCreate, BookingRequest, SlotStatus, SensorData, UserType
from .database import slots_db, users_db, init_db, get_user_by_username
from .hardware_service import setup_gpio, update_pi_sensors, set_led, PI_PINOUT

# --- Lifecycle ---
@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    setup_gpio()
    # Background task for Pi Sensors (if running on Pi)
    # We can run a simplified loop or just rely on requests. 
    # For a real-time system, a background loop is better.
    asyncio.create_task(sensor_loop())
    yield
    # Shutdown
    # GPIO.cleanup() # Optional

async def sensor_loop():
    while True:
        update_pi_sensors()
        # After updating sensors, we need to refresh LED states based on TODAY's bookings
        refresh_leds()
        await asyncio.sleep(1) # 1Hz update rate

def refresh_leds():
    today_str = date.today().strftime("%d%m%Y")
    for slot_id, slot in slots_db.items():
        # Check if booked for TODAY
        is_booked_today = slot.booking_date and slot.booking_date.strftime("%d%m%Y") == today_str
        
        # LED Logic: "The booked slot's LED lights up when booked"
        # Assuming this means IF booked for TODAY -> LED ON.
        # Regardless of physical occupation? Usually yes, to indicate reservation.
        if is_booked_today:
            set_led(slot_id, True)
        else:
            set_led(slot_id, False)

app = FastAPI(lifespan=lifespan)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For demo purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"message": "SmartPark API is running"}

# --- Auth ---

@app.post("/signup")
def signup(user: UserCreate):
    if get_user_by_username(user.username):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    new_user = User(
        username=user.username,
        password=user.password, # In real app, hash this!
        is_disabled=user.is_disabled,
        is_elderly=user.is_elderly
    )
    users_db[new_user.id] = new_user
    return {"message": "User created", "user_id": new_user.id}

@app.post("/login")
def login(login_data: dict = Body(...)):
    username = login_data.get("username")
    password = login_data.get("password")
    user = get_user_by_username(username)
    if not user or user.password != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "user_id": user.id,
        "username": user.username,
        "is_disabled": user.is_disabled,
        "is_elderly": user.is_elderly
    }

# --- Slots & Booking ---

@app.get("/slots")
def get_slots(date_str: str = Query(..., alias="date"), user_id: Optional[str] = None):
    """
    Get slots status for a specific date (DDMMYYYY).
    user_id is optional: if provided, we identify 'my bookings'.
    """
    # Parse requested date
    # Format DDMMYYYY
    try:
        req_date = datetime.strptime(date_str, "%d%m%Y").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use DDMMYYYY")

    today = date.today()
    response_slots = []
    
    for s_id, slot in slots_db.items():
        # Create a copy to modify status for response without touching DB persistence state needlessly
        # (Though we need to check the DB's booking info)
        
        # Default status from physical sensor (only relevant if date is TODAY)
        # If date is FUTURE, physical status is irrelevant (always FREE unless booked)
        
        current_status = SlotStatus.FREE
        
        if req_date == today:
             current_status = slot.status # Takes physical sensor into account
        
        # Overlay Booking Data
        # Check if THIS slot is booked for req_date
        is_booked_for_date = False
        booked_by_me = False
        
        if slot.booking_date == req_date:
            is_booked_for_date = True
            current_status = SlotStatus.BOOKED
            if user_id and slot.booked_by_user_id == user_id:
                booked_by_me = True

        # Frontend needs: id, mall_id, level_id, slot_number, status, is_my_booking, types
        response_slots.append({
            "id": slot.id,
            "mall_id": slot.mall_id,
            "level_id": slot.level_id,
            "slot_number": slot.slot_number,
            "status": current_status,
            "is_my_booking": booked_by_me,
            "is_reserved_disabled": slot.is_reserved_disabled,
            "is_reserved_elderly": slot.is_reserved_elderly
        })
        
    return response_slots

@app.post("/book")
def book_slot(booking: BookingRequest):
    # Bookings can be made only in 1 day in advance (i.e. for the next day)
    # OR maybe "today or next day"? Use case says: "Whether the booking is for today or the next day"
    # But later: "Bookings can be made only in 1 day in advance".
    # I will support both but let Frontend enforce policy or loose enforcement.
    # Let's start with strict validation if needed, but user requirement is a bit conflicting.
    # "Bookings can be made only in 1 day in advance" might mean "Max 1 day in advance" OR "Only for tomorrow".
    # Given "booking page asking for Whether the booking is for today or the next day", it means BOTH are allowed.
    
    try:
        req_date = datetime.strptime(booking.booking_date, "%d%m%Y").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    slot = slots_db.get(booking.slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
        
    # Check eligibility
    user = users_db.get(booking.user_id)
    if not user:
         raise HTTPException(status_code=404, detail="User not found")
         
    if slot.is_reserved_disabled and not user.is_disabled:
        raise HTTPException(status_code=403, detail="Reserved for Disabled usage")
        
    if slot.is_reserved_elderly and not user.is_elderly:
        raise HTTPException(status_code=403, detail="Reserved for Elderly usage")
        
    # Check availability
    if slot.booking_date == req_date:
        raise HTTPException(status_code=409, detail="Slot already booked for this date")
        
    # Apply Booking
    slot.booked_by_user_id = user.id
    slot.booking_date = req_date
    
    # If booked for today, update LED immediately
    if req_date == date.today():
        set_led(slot.id, True)
    
    return {"message": "Booking successful"}

@app.post("/cancel")
def cancel_booking(payload: dict = Body(...)):
    slot_id = payload.get("slot_id")
    user_id = payload.get("user_id")
    
    slot = slots_db.get(slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
        
    if slot.booked_by_user_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")
        
    # Clear booking
    slot.booked_by_user_id = None
    slot.booking_date = None
    
    # Update LED (Turn off)
    set_led(slot.id, False)
    
    return {"message": "Booking cancelled"}

# --- Sensor Ingestion (ESP32) ---

@app.post("/sensor/esp32")
def receive_esp32_data(data: SensorData):
    # Expecting 4 distances for Mall 2 (Level 1)
    # M2-L1-S1, S2, S3, S4
    
    # Mapping index to Slot ID
    # Usually passed in order: S1, S2, S3, S4
    m2_slots = ["M2-L1-S1", "M2-L1-S2", "M2-L1-S3", "M2-L1-S4"]
    
    for i, dist in enumerate(data.distances):
        if i < len(m2_slots):
            slot_id = m2_slots[i]
            slot = slots_db.get(slot_id)
            if slot:
                # Store physical status in slot
                # Logic: < 10cm = OCCUPIED
                if dist < 10.0:
                    slot.status = SlotStatus.OCCUPIED
                else:
                    slot.status = SlotStatus.FREE
                    
    return {"status": "ok"}
