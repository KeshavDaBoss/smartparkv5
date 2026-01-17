import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { bookSlot } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { NODES, findPath } from '../utils/astar';

export default function FloorPlan({ mallId, level, slots, refreshSlots, onNavigate }) {
    const { user } = useAuth();
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [bookingDate, setBookingDate] = useState('today'); // 'today' or 'tomorrow'
    const [path, setPath] = useState(null);
    const containerRef = useRef(null);
    const modalRef = useRef(null);

    // Filter slots for this mall/level
    const currentSlots = slots.filter(s => s.mall_id === mallId && s.level_id === parseInt(level));

    // Handle Nav
    useEffect(() => {
        if (onNavigate) {
            // "Navigate to closest" triggered from parent
            // Find closest available slot
            const entries = ['ENTRY_1', 'ENTRY_2'];
            // Simple logic: just pick first available
            const available = currentSlots.find(s => s.status === 'free');
            if (available) {
                const p = findPath(entries[0], available.id);
                setPath(p);
            } else {
                alert("No available slots to navigate to.");
            }
        }
    }, [onNavigate, currentSlots]);

    const handleSlotClick = (slot) => {
        if (slot.is_my_booking) {
            // Show Nav options
            if (window.confirm("Navigate to your slot?")) {
                const p = findPath('ENTRY_1', slot.id);
                setPath(p);
            }
        } else if (slot.status === 'free') {
            setSelectedSlot(slot);
            // Animate Modal
            if (modalRef.current) gsap.fromTo(modalRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1 });
        }
    };

    const confirmBooking = async () => {
        try {
            const dateObj = new Date();
            if (bookingDate === 'tomorrow') {
                dateObj.setDate(dateObj.getDate() + 1);
            }
            const dateStr = formatDate(dateObj); // DDMMYYYY

            await bookSlot(selectedSlot.id, user.user_id, dateStr);
            alert("Booking Successful!");
            setSelectedSlot(null);
            refreshSlots(); // correct way to update UI
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

    // Get color based on status
    const getSlotColor = (slot) => {
        if (slot.is_my_booking) return 'var(--slot-my-booking)';
        if (slot.status === 'booked') return 'var(--slot-booked)';
        if (slot.status === 'occupied') return 'var(--slot-occupied)';
        return 'var(--slot-free)';
    };

    // Render Logic
    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            {/* Image Layer */}
            <div style={{ position: 'relative', width: '100%', paddingBottom: '75%', background: '#222', borderRadius: '12px', overflow: 'hidden' }}>
                <img
                    src="/floorplan.png"
                    alt="Floor Plan"
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
                />

                {/* SVG Overlay for Paths and Slots */}
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    {/* Path Line */}
                    {path && path.length > 1 && (
                        <polyline
                            points={path.map(n => `${n.x}%,${n.y}%`).join(' ')}
                            fill="none"
                            stroke="yellow"
                            strokeWidth="4"
                            strokeDasharray="10,5"
                        >
                            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite" />
                        </polyline>
                    )}
                </svg>

                {/* Slots Layer */}
                {currentSlots.map(slot => {
                    const node = NODES[slot.id];
                    if (!node) return null; // Skip if no coordinate

                    return (
                        <div
                            key={slot.id}
                            onClick={() => handleSlotClick(slot)}
                            style={{
                                position: 'absolute',
                                top: `${node.y}%`, left: `${node.x}%`,
                                transform: 'translate(-50%, -50%)',
                                width: '60px', height: '40px',
                                backgroundColor: getSlotColor(slot),
                                border: '2px solid white',
                                borderRadius: '4px',
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                fontSize: '0.8rem', fontWeight: 'bold', color: '#000',
                                cursor: 'pointer',
                                boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={(e) => {
                                gsap.to(e.currentTarget, { scale: 1.2, zIndex: 10 });
                            }}
                            onMouseLeave={(e) => {
                                gsap.to(e.currentTarget, { scale: 1, zIndex: 1 });
                            }}
                        >
                            {slot.slot_number}
                        </div>
                    );
                })}
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
                        <p style={{ marginBottom: '1rem' }}>Select Date:</p>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
                            <button
                                style={{ background: bookingDate === 'today' ? 'var(--primary)' : '#555' }}
                                onClick={() => setBookingDate('today')}
                            >
                                Today
                            </button>
                            <button
                                style={{ background: bookingDate === 'tomorrow' ? 'var(--primary)' : '#555' }}
                                onClick={() => setBookingDate('tomorrow')}
                            >
                                Tomorrow
                            </button>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button style={{ background: 'transparent' }} onClick={() => setSelectedSlot(null)}>Cancel</button>
                            <button onClick={confirmBooking}>Confirm Booking</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
