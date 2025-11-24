import { useState, useEffect } from 'react';
import { Layout, Plus, Pencil, Trash2 } from 'lucide-react';
import { getAuthToken } from '../components/ProtectedRoute';
import styles from './Rooms.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Client {
  id: string;
  name: string;
}

interface Venue {
  id: string;
  name: string;
  clientId: string;
}

interface Room {
  id: string;
  name: string;
  clientId: string;
  venueId: string;
  created_at: string;
}

export function Rooms() {
  const [clients, setClients] = useState<Client[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    venueId: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = getAuthToken();

      // Fetch clients
      const clientsRes = await fetch(`${API_URL}/clients`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);

        // Fetch venues for each client
        const allVenues: Venue[] = [];
        for (const client of clientsData) {
          const venuesRes = await fetch(`${API_URL}/clients/${client.id}/venues`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (venuesRes.ok) {
            const venuesData = await venuesRes.json();
            allVenues.push(...venuesData);
          }
        }
        setVenues(allVenues);

        // Fetch rooms for each venue
        const allRooms: Room[] = [];
        for (const venue of allVenues) {
          const roomsRes = await fetch(`${API_URL}/clients/${venue.clientId}/venues/${venue.id}/rooms`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (roomsRes.ok) {
            const roomsData = await roomsRes.json();
            allRooms.push(...roomsData);
          }
        }
        setRooms(allRooms);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = getAuthToken();
      const { clientId, venueId, ...payload } = formData;

      const url = editingId
        ? `${API_URL}/clients/${clientId}/venues/${venueId}/rooms/${editingId}`
        : `${API_URL}/clients/${clientId}/venues/${venueId}/rooms`;

      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchData();
        setShowForm(false);
        setFormData({ name: '', clientId: '', venueId: '' });
        setEditingId(null);
      }
    } catch (error) {
      console.error('Failed to save room:', error);
    }
  };

  const handleEdit = (room: Room) => {
    setFormData({
      name: room.name,
      clientId: room.clientId,
      venueId: room.venueId,
    });
    setEditingId(room.id);
    setShowForm(true);
  };

  const handleDelete = async (room: Room) => {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
      const token = getAuthToken();
      const response = await fetch(
        `${API_URL}/clients/${room.clientId}/venues/${room.venueId}/rooms/${room.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to delete room:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ name: '', clientId: '', venueId: '' });
    setEditingId(null);
  };

  const filteredVenues = formData.clientId
    ? venues.filter((v) => v.clientId === formData.clientId)
    : [];

  const getClientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name || 'Unknown';
  const getVenueName = (venueId: string) => venues.find((v) => v.id === venueId)?.name || 'Unknown';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.icon}>
            <Layout size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Rooms</h1>
            <p className={styles.subtitle}>Manage escape rooms and game spaces</p>
          </div>
        </div>

        <button onClick={() => setShowForm(true)} className={styles.addButton}>
          <Plus size={16} />
          Add Room
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>
            {editingId ? 'Edit Room' : 'New Room'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Client</label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value, venueId: '' })}
                required
                className={styles.select}
              >
                <option value="">Select client...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Venue</label>
              <select
                value={formData.venueId}
                onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                required
                disabled={!formData.clientId}
                className={styles.select}
              >
                <option value="">Select venue...</option>
                {filteredVenues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Room Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className={styles.input}
                placeholder="Enter room name"
              />
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={handleCancel} className={styles.cancelButton}>
                Cancel
              </button>
              <button type="submit" className={styles.submitButton}>
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState}>
          <p>Loading rooms...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className={styles.emptyState}>
          <Layout size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>No rooms yet</p>
          <p className={styles.emptySubtext}>Create your first room to get started</p>
        </div>
      ) : (
        <div className={styles.roomsList}>
          {rooms.map((room) => (
            <div key={room.id} className={styles.roomCard}>
              <div className={styles.roomInfo}>
                <h3 className={styles.roomName}>{room.name}</h3>
                <p className={styles.roomMeta}>
                  {getClientName(room.clientId)} • {getVenueName(room.venueId)}
                </p>
                <p className={styles.roomId}>ID: {room.id}</p>
              </div>
              <div className={styles.roomActions}>
                <button onClick={() => handleEdit(room)} className={styles.editButton} title="Edit">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(room)} className={styles.deleteButton} title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
