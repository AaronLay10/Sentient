import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useRoomContext } from '../contexts/RoomContext';
import styles from './RoomSelector.module.css';

interface Client {
  id: string;
  name: string;
}

interface Venue {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface Room {
  id: string;
  name: string;
  room_id?: string;
  venueId: string;
}

interface RoomSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string; // Optional path to redirect after selection
}

const RoomSelector: React.FC<RoomSelectorProps> = ({ isOpen, onClose, redirectTo }) => {
  const navigate = useNavigate();
  const { selectedClientId, selectedVenueId, selectedRoomId, setRoomContext } = useRoomContext();
  
  const [tempClientId, setTempClientId] = useState<string>(selectedClientId || '');
  const [tempVenueId, setTempVenueId] = useState<string>(selectedVenueId || '');
  const [tempRoomId, setTempRoomId] = useState<string>(selectedRoomId || '');

  // Fetch clients (for super admin)
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: api.getClients,
    enabled: isOpen,
  });

  // Auto-select first client if only one exists
  useEffect(() => {
    if (clients.length === 1 && !tempClientId) {
      setTempClientId(clients[0].id);
    }
  }, [clients, tempClientId]);

  // Fetch venues for selected client
  const { data: venues = [] } = useQuery<Venue[]>({
    queryKey: ['venues', tempClientId],
    queryFn: () => api.getClientVenues(tempClientId),
    enabled: isOpen && Boolean(tempClientId),
  });

  // Fetch rooms for selected venue
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['rooms', tempVenueId],
    queryFn: async () => {
      const allRooms = await api.getRooms();
      return allRooms.filter((room) => room.venueId === tempVenueId || room.venue_id === tempVenueId);
    },
    enabled: isOpen && Boolean(tempVenueId),
  });

  // Auto-select first venue if only one exists
  useEffect(() => {
    if (venues.length === 1 && !tempVenueId) {
      setTempVenueId(venues[0].id);
    }
  }, [venues, tempVenueId]);

  // Auto-select first room if only one exists
  useEffect(() => {
    if (rooms.length === 1 && !tempRoomId) {
      setTempRoomId(rooms[0].id);
    }
  }, [rooms, tempRoomId]);

  // Auto-select and navigate if only one room total (single client, single venue, single room)
  useEffect(() => {
    if (
      isOpen &&
      clients.length === 1 &&
      venues.length === 1 &&
      rooms.length === 1 &&
      tempClientId &&
      tempVenueId &&
      tempRoomId &&
      !selectedRoomId // Only auto-select if no room is currently selected
    ) {
      const client = clients[0];
      const venue = venues[0];
      const room = rooms[0];
      console.log('[RoomSelector] Auto-selecting single room:', room.name);
      setRoomContext(tempClientId, client.name, tempVenueId, venue.name, tempRoomId, room.name);
      
      const targetPath = redirectTo || `/room/${tempRoomId}/puzzles`;
      navigate(targetPath);
      onClose();
    }
  }, [isOpen, clients.length, venues.length, rooms.length, tempClientId, tempVenueId, tempRoomId, selectedRoomId, setRoomContext, navigate, redirectTo, onClose, rooms, clients, venues]);

  // Reset dependent selections when parent changes
  useEffect(() => {
    setTempVenueId('');
    setTempRoomId('');
  }, [tempClientId]);

  useEffect(() => {
    setTempRoomId('');
  }, [tempVenueId]);

  if (!isOpen) return null;

  const handleSelect = () => {
    const selectedClient = clients.find((c: Client) => c.id === tempClientId);
    const selectedVenue = venues.find((v: Venue) => v.id === tempVenueId);
    const selectedRoom = rooms.find((r: Room) => r.id === tempRoomId);
    
    if (tempClientId && tempVenueId && tempRoomId && selectedClient && selectedVenue && selectedRoom) {
      setRoomContext(
        tempClientId, 
        selectedClient.name,
        tempVenueId, 
        selectedVenue.name,
        tempRoomId, 
        selectedRoom.name
      );
      
      // Redirect to the specified page or default to puzzles
      const targetPath = redirectTo || `/room/${tempRoomId}/puzzles`;
      navigate(targetPath);
      
      onClose();
    }
  };

  const handleCancel = () => {
    // Reset to current context
    setTempClientId(selectedClientId || '');
    setTempVenueId(selectedVenueId || '');
    setTempRoomId(selectedRoomId || '');
    onClose();
  };

  // const selectedClient = clients.find(c => c.id === tempClientId);
  // const selectedVenue = venues.find(v => v.id === tempVenueId);
  // const selectedRoom = rooms.find(r => r.id === tempRoomId);

  return (
    <div className={styles.roomSelectorModal} onClick={handleCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Select Room</h2>
          <button className={styles.closeButton} onClick={handleCancel}>×</button>
        </div>

        {clients.length === 0 && (
          <div className={styles.emptyState}>
            <p>No clients available.</p>
            <p className={styles.helperText}>Please contact your administrator.</p>
          </div>
        )}

        {clients.length > 0 && (
          <>
            {clients.length > 1 && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Client</label>
                <select
                  className={styles.select}
                  value={tempClientId}
                  onChange={(e) => setTempClientId(e.target.value)}
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>Venue</label>
              <select
                className={styles.select}
                value={tempVenueId}
                onChange={(e) => setTempVenueId(e.target.value)}
                disabled={!tempClientId || venues.length === 0}
              >
                <option value="">Select a venue...</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                    {venue.city && ` - ${venue.city}`}
                  </option>
                ))}
              </select>
              {tempClientId && venues.length === 0 && (
                <p className={styles.helperText}>No venues available. Create one in the Clients page.</p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Room</label>
              <select
                className={styles.select}
                value={tempRoomId}
                onChange={(e) => setTempRoomId(e.target.value)}
                disabled={!tempVenueId || rooms.length === 0}
              >
                <option value="">Select a room...</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                    {room.room_id && ` (${room.room_id})`}
                  </option>
                ))}
              </select>
              {tempVenueId && rooms.length === 0 && (
                <p className={styles.helperText}>No rooms available. Create one in the Rooms page.</p>
              )}
            </div>

            <div className={styles.buttonGroup}>
              <button className={`${styles.button} ${styles.secondaryButton}`} onClick={handleCancel}>
                Cancel
              </button>
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={handleSelect}
                disabled={!tempClientId || !tempVenueId || !tempRoomId}
              >
                Select Room
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RoomSelector;
