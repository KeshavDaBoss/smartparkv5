import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { bookSlot } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { findPath, NODES } from '../utils/astar';

export default function FloorPlan({ mallId, level, slots, refreshSlots, onNavigate }) {
    const { user } = useAuth();
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingDate, setBookingDate] = useState('today');
    const [path, setPath] = useState(null);
    const modalRef = useRef(null);

    // Filter slots for this view
    const currentSlots = slots.filter(s => s.mall_id === mallId && s.level_id === parseInt(level));

    // Sort slots by number to ensure correct order in grid
    currentSlots.sort((a, b) => a.slot_number - b.slot_number);

    useEffect(() => {
        if (onNavigate) {
            // Find closest available slot matching user needs
            let targetSlot = null;

            // Prioritize specialized slots if user has traits
            if (user.is_disabled) {
                targetSlot = currentSlots.find(s => s.is_reserved_disabled && s.status === 'free');
            }
            if (!targetSlot && user.is_elderly) {
                targetSlot = currentSlots.find(s => s.is_reserved_elderly && s.status === 'free');
            }
            // Fallback to normal slots
            if (!targetSlot) {
                targetSlot = currentSlots.find(s => !s.is_reserved_disabled && !s.is_reserved_elderly && s.status === 'free');
            }

            if (targetSlot) {
                const startNodeId = 'ENTRY'; // We'll map this in astar
                const endNodeId = targetSlot.id;
                const p = findPath(startNodeId, endNodeId);
                setPath(p);
            } else {
                alert("No suitable slots available.");
            }
        }
    }, [onNavigate, currentSlots, user]);

    const handleSlotClick = (slot) => {
        if (slot.is_my_booking) {
            if (window.confirm("Navigate to your slot?")) {
                const p = findPath('ENTRY', slot.id);
                setPath(p);
            }
            return;
        }

        // Booking Constraints
        if (slot.status !== 'free') return; // Can't book occupied/booked

        // Mall 1 Restrictions
        // L1: S1, S2 Bookable. S3(Disabled), S4(Elderly).
        // L2: None bookable? User said: "Only 4 slots bookable (2 in Mall 2, 2 in Mall 1)"
        // "Mall 1: Level 1- slot 1 (bookable), Slot 2 (Bookable)..."
        // "level 2- Slot 5, 6, 7, 8 (normal)" -> implied NOT bookable?
        // Let's enforce: If it's normal and NOT S1/S2/M2-S1/M2-S2, maybe not bookable?
        // But user constraint: "Only 4 slots bookable".

        const isBookable = (slot.mall_id === 'mall1' && slot.level_id === 1 && (slot.slot_number === 1 || slot.slot_number === 2)) ||
            (slot.mall_id === 'mall2' && slot.level_id === 1 && (slot.slot_number === 1 || slot.slot_number === 2)) ||
            slot.is_reserved_disabled || slot.is_reserved_elderly; // Special slots usually bookable?

        // Wait, "Only 4 slots bookable". That refers to the general public ones maybe?
        // "Slot 3(Disabled), Slot 4 (elderly)"... "People will be able to make bookings as well... options like 'Are you above 60?' for specially reserved slots"
        // So Disabled/Elderly ARE bookable.

        // Revised Logic:
        // Bookable IF:
        // 1. Is S1 or S2 (General)
        // 2. Is Disabled AND User is Disabled
        // 3. Is Elderly AND User is Elderly

        let canBook = false;
        if (slot.slot_number === 1 || slot.slot_number === 2) canBook = true;
        if (slot.is_reserved_disabled && user.is_disabled) canBook = true;
        if (slot.is_reserved_elderly && user.is_elderly) canBook = true;

        // Prevent normal users booking special slots
        if (slot.is_reserved_disabled && !user.is_disabled) {
            alert("Reserved for Disabled Users");
            return;
        }
        if (slot.is_reserved_elderly && !user.is_elderly) {
            alert("Reserved for Elderly Users");
            return;
        }

        if (canBook) {
            setSelectedSlot(slot);
            if (modalRef.current) gsap.fromTo(modalRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1 });
        } else {
            alert("This slot is not bookable online (FCFS only)");
        }
    };

    const confirmBooking = async () => {
        try {
            // Date Logic
            const dateObj = new Date();
            if (bookingDate === 'tomorrow') {
                dateObj.setDate(dateObj.getDate() + 1);
            }
            const dateStr = formatDate(dateObj); // DDMMYYYY

            await bookSlot(selectedSlot.id, user.user_id, dateStr);
            alert("Booking Successful!");
            setSelectedSlot(null);
            refreshSlots();
        } catch (e) {
            alert(e.message);
        }
    };

    const formatDate = (d) => {
        let dd = d.getDate();
        let mm = d.getMonth() + 1;
        let yyyy = d.getFullYear();
        if (dd < 10) dd = '0' + dd;
        if (mm < 10) mm = '0' + mm;
        return '' + dd + mm + yyyy;
    };

    // Styling
    const getSlotStyle = (slot) => {
        // Base Style
        let style = {
            width: '80px', height: '120px',
            border: '2px solid transparent',
            borderRadius: '8px',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            cursor: 'pointer',
            fontWeight: 'bold',
            color: '#000',
            position: 'relative',
            transition: 'all 0.3s'
        };

        // Colors
        if (slot.is_my_booking) {
            style.backgroundColor = 'var(--slot-my-booking)'; // Purple
            style.color = '#FFF';
        } else if (slot.status === 'booked') {
            style.backgroundColor = 'var(--slot-booked)'; // Blue
            style.color = '#FFF';
        } else if (slot.is_reserved_disabled) {
            style.backgroundColor = 'orange'; // Orange
        } else if (slot.is_reserved_elderly) {
            style.backgroundColor = 'yellow'; // Yellow
            style.color = '#000';
        } else {
            // Normal slots?
            // "Blue are the slots... Green is available"
            // Wait, the USER said: "slots in the floor design are Green for available, Red for Occupied, and Blue for Booked."
            // AND "Slot should be Orange if disabled... Yellow for elderly"
            // AND "blue are the slots" in the NEW description.

            // Reconciliation:
            // AVAILABLE (Free) = Green
            // OCCUPIED (Physically) = Red (or Red outline)
            // BOOKED = Blue

            // BUT for Disabled: Orange (Base), Green if Avail?
            // "Slot should be Orange if the slot is for disabled... green if available"
            // This is contradictory. "Orange if disabled... green if available".
            // Maybe Orange Border? Or Orange Icon?
            // Let's try:
            // Default Free = Green.
            // Disabled Free = Orange.
            // Elderly Free = Yellow.
            // ANY Occupied = Red Outline + Base Color? Or just Red?
            // "Red outline if occupied, green if available" (for disabled/orange slot).

            if (slot.status === 'free') {
                style.backgroundColor = 'var(--slot-free)'; // Green
            } else if (slot.status === 'occupied') {
                // Red Outline?
                style.border = '4px solid red';
                style.backgroundColor = '#444'; // Dark background to show outline?
                // Or just Red background? 
                // "Red for Occupied" was the original.
                // "red outline if occupied" is for special slots.
                style.backgroundColor = 'var(--slot-free)';
            }
        }

        // Special Coloring overrides based on user request "blue are the slots"
        // I will stick to status based colors because "Blue are slots" might mean the physical paint.
        // Status colors are more important for UI.

        // Disabled/Elderly specific override
        if (slot.is_reserved_disabled) {
            if (slot.status === 'free') style.backgroundColor = 'orange';
            if (slot.status === 'occupied') {
                style.backgroundColor = 'orange';
                style.border = '5px solid red';
            }
        } else if (slot.is_reserved_elderly) {
            if (slot.status === 'free') style.backgroundColor = 'yellow';
            if (slot.status === 'occupied') {
                style.backgroundColor = 'yellow';
                style.border = '5px solid red';
            }
        } else {
            // Normal
            if (slot.status === 'free') style.backgroundColor = 'var(--slot-free)'; // Green
            if (slot.status === 'occupied') {
                style.backgroundColor = '#222';
                style.border = '5px solid red'; // Consistent style
            }
        }

        // Selected?
        if (selectedSlot && selectedSlot.id === slot.id) {
            style.transform = 'scale(1.1)';
            style.boxShadow = '0 0 15px white';
        }

        return style;
    };

    return (
        <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* The "Floor" Container */}
            <div style={{
                background: '#1a1a1a',
                padding: '2rem',
                borderRadius: '15px',
                position: 'relative',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}>
                {/* Visual Entry Point */}
                <div style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', background: '#333', padding: '10px', borderRadius: '8px', writingMode: 'vertical-rl' }}>
                    ENTRY
                </div>

                {/* Slots Row (Top - if we had two rows facing each other, but here we have 4 slots left-to-right) */}
                {/* The user description: "left to right". */}
                {/* For Mall 1 Level 2 (8 slots), maybe 2 rows? */}
                {/* M1-L2-S5..8. Wait, user said M1-L2 has S5,6,7,8. */}
                {/* Let's render them in a flex Grid */}

                <div style={{ display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' }}>
                    {currentSlots.map((slot, i) => (
                        <div key={slot.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div
                                onClick={() => handleSlotClick(slot)}
                                style={getSlotStyle(slot)}
                            >
                                <span style={{ fontSize: '1.2rem' }}>{slot.slot_number}</span>
                                {slot.is_reserved_disabled && <span style={{ fontSize: '2rem' }}>♿</span>}
                                {slot.is_reserved_elderly && <span style={{ fontSize: '2rem' }}>👴</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Walkway / Path Area */}
                {/* We use SVG overlay for the path */}
                <svg style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10
                }}>
                    {path && path.length > 0 && (
                        <polyline
                            points={path.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="white"
                            strokeWidth="5"
                            strokeDasharray="10,5"
                        >
                            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" repeatCount="indefinite" />
                        </polyline>
                    )}
                </svg>

            </div>

            {/* Booking Modal */}
            {selectedSlot && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', zIndex: 100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div ref={modalRef} className="card" style={{ width: '300px', background: '#333' }}>
                        <h3>Book Slot {selectedSlot.slot_number}</h3>
                        <p style={{ marginBottom: '1rem', color: '#ccc' }}>Select Date:</p>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                            <button
                                style={{ background: bookingDate === 'today' ? 'var(--primary)' : '#555', flex: 1 }}
                                onClick={() => setBookingDate('today')}
                            >
                                Today
                            </button>
                            <button
                                style={{ background: bookingDate === 'tomorrow' ? 'var(--primary)' : '#555', flex: 1 }}
                                onClick={() => setBookingDate('tomorrow')}
                            >
                                Tomorrow
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button style={{ background: 'transparent', color: '#888' }} onClick={() => setSelectedSlot(null)}>Cancel</button>
                            <button onClick={confirmBooking}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// A Little helper component for legends if needed
