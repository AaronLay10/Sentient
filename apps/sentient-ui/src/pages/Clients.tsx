import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { getAuthToken, isSentientAdmin } from '../components/ProtectedRoute';
import styles from './Clients.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Venue {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  created_at: string;
  venues?: Venue[];
}

export function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [showVenueForm, setShowVenueForm] = useState<string | null>(null);
  const [venueFormData, setVenueFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);

  // Check if user has access to this page
  useEffect(() => {
    if (!isSentientAdmin()) {
      // Redirect non-admins to overview
      navigate('/overview', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    // Only fetch if user is admin
    if (isSentientAdmin()) {
      fetchClients();
    }
  }, []);

  const fetchClients = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Fetch venues for each client
        const clientsWithVenues = await Promise.all(
          data.map(async (client: Client) => {
            try {
              const venuesResponse = await fetch(`${API_URL}/clients/${client.id}/venues`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (!venuesResponse.ok) {
                const errorText = await venuesResponse.text();
                console.error(`Failed to fetch venues for client ${client.id}:`, {
                  status: venuesResponse.status,
                  statusText: venuesResponse.statusText,
                  error: errorText
                });
                return { ...client, venues: [] };
              }
              
              const venues = await venuesResponse.json();
              return { ...client, venues };
            } catch (error) {
              console.error(`Error fetching venues for client ${client.id}:`, error);
              return { ...client, venues: [] };
            }
          })
        );
        setClients(clientsWithVenues);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = getAuthToken();
      const url = editingId
        ? `${API_URL}/clients/${editingId}`
        : `${API_URL}/clients`;

      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchClients();
        setShowForm(false);
        setFormData({ name: '' });
        setEditingId(null);
      }
    } catch (error) {
      console.error('Failed to save client:', error);
    }
  };

  const handleEdit = (client: Client) => {
    setFormData({ name: client.name });
    setEditingId(client.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client? This will delete all associated venues, rooms, and data.')) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/clients/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchClients();
      }
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ name: '' });
    setEditingId(null);
  };

  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const handleVenueSubmit = async (e: React.FormEvent, clientId: string) => {
    e.preventDefault();
    console.log('Venue submit handler called', { clientId, venueFormData });

    try {
      const token = getAuthToken();
      const url = editingVenueId
        ? `${API_URL}/clients/${clientId}/venues/${editingVenueId}`
        : `${API_URL}/clients/${clientId}/venues`;

      const method = editingVenueId ? 'PATCH' : 'POST';

      console.log('Submitting venue:', { url, method, data: venueFormData });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(venueFormData),
      });

      console.log('Venue response:', { status: response.status, ok: response.ok });

      if (response.ok) {
        const result = await response.json();
        console.log('Venue created/updated:', result);
        await fetchClients();
        setShowVenueForm(null);
        setVenueFormData({ name: '', address: '', city: '', state: '', zipCode: '' });
        setEditingVenueId(null);
      } else {
        const error = await response.text();
        console.error('Venue submission failed:', error);
        alert(`Failed to save venue: ${error}`);
      }
    } catch (error) {
      console.error('Failed to save venue:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditVenue = (venue: Venue, clientId: string) => {
    setVenueFormData({
      name: venue.name,
      address: venue.address || '',
      city: venue.city || '',
      state: venue.state || '',
      zipCode: venue.zipCode || '',
    });
    setEditingVenueId(venue.id);
    setShowVenueForm(clientId);
  };

  const handleDeleteVenue = async (clientId: string, venueId: string) => {
    if (!confirm('Are you sure you want to delete this venue? This will delete all associated rooms and data.')) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/clients/${clientId}/venues/${venueId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchClients();
      }
    } catch (error) {
      console.error('Failed to delete venue:', error);
    }
  };

  const handleCancelVenue = () => {
    setShowVenueForm(null);
    setVenueFormData({ name: '', address: '', city: '', state: '', zipCode: '' });
    setEditingVenueId(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.icon}>
            <Building2 size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Clients</h1>
            <p className={styles.subtitle}>Manage customer organizations and escape room operators</p>
          </div>
        </div>

        <button onClick={() => setShowForm(true)} className={styles.addButton}>
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>
            {editingId ? 'Edit Client' : 'New Client'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Client Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                required
                className={styles.input}
                placeholder="Enter client organization name"
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
          <p>Loading clients...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>No clients yet</p>
          <p className={styles.emptySubtext}>Create your first client to get started</p>
        </div>
      ) : (
        <div className={styles.clientsList}>
          {clients.map((client) => (
            <div key={client.id} className={styles.clientCard}>
              <div className={styles.clientHeader} onClick={() => toggleClient(client.id)}>
                <div className={styles.clientInfo}>
                  <div className={styles.clientTitleRow}>
                    {expandedClients.has(client.id) ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                    <h3 className={styles.clientName}>{client.name}</h3>
                    <span className={styles.venueCount}>
                      {client.venues?.length || 0} {client.venues?.length === 1 ? 'venue' : 'venues'}
                    </span>
                  </div>
                  <p className={styles.clientId}>ID: {client.id}</p>
                  <p className={styles.clientDate}>
                    Created: {new Date(client.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className={styles.clientActions} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(client)} className={styles.editButton} title="Edit">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(client.id)} className={styles.deleteButton} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedClients.has(client.id) && (
                <div className={styles.venuesSection}>
                  <div className={styles.venuesHeader}>
                    <h4 className={styles.venuesTitle}>
                      <MapPin size={16} />
                      Venues
                    </h4>
                    <button
                      onClick={() => setShowVenueForm(client.id)}
                      className={styles.addVenueButton}
                    >
                      <Plus size={14} />
                      Add Venue
                    </button>
                  </div>

                  {showVenueForm === client.id && (
                    <div className={styles.venueFormCard}>
                      <h5 className={styles.venueFormTitle}>
                        {editingVenueId ? 'Edit Venue' : 'New Venue'}
                      </h5>
                      <form onSubmit={(e) => handleVenueSubmit(e, client.id)}>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Venue Name *</label>
                          <input
                            type="text"
                            value={venueFormData.name}
                            onChange={(e) => setVenueFormData({ ...venueFormData, name: e.target.value })}
                            required
                            className={styles.input}
                            placeholder="Enter venue name"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Address</label>
                          <input
                            type="text"
                            value={venueFormData.address}
                            onChange={(e) => setVenueFormData({ ...venueFormData, address: e.target.value })}
                            className={styles.input}
                            placeholder="Street address"
                          />
                        </div>
                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>City</label>
                            <input
                              type="text"
                              value={venueFormData.city}
                              onChange={(e) => setVenueFormData({ ...venueFormData, city: e.target.value })}
                              className={styles.input}
                              placeholder="City"
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>State</label>
                            <input
                              type="text"
                              value={venueFormData.state}
                              onChange={(e) => setVenueFormData({ ...venueFormData, state: e.target.value })}
                              className={styles.input}
                              placeholder="State"
                            />
                          </div>
                          <div className={styles.formGroup}>
                            <label className={styles.label}>Zip Code</label>
                            <input
                              type="text"
                              value={venueFormData.zipCode}
                              onChange={(e) => setVenueFormData({ ...venueFormData, zipCode: e.target.value })}
                              className={styles.input}
                              placeholder="Zip"
                            />
                          </div>
                        </div>
                        <div className={styles.formActions}>
                          <button type="button" onClick={handleCancelVenue} className={styles.cancelButton}>
                            Cancel
                          </button>
                          <button type="submit" className={styles.submitButton}>
                            {editingVenueId ? 'Update' : 'Create'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {client.venues && client.venues.length > 0 ? (
                    <div className={styles.venuesList}>
                      {client.venues.map((venue) => (
                        <div key={venue.id} className={styles.venueCard}>
                          <div className={styles.venueInfo}>
                            <div className={styles.venueHeader}>
                              <MapPin size={16} className={styles.venueIcon} />
                              <h5 className={styles.venueName}>{venue.name}</h5>
                            </div>
                            {venue.address && (
                              <p className={styles.venueAddress}>
                                {venue.address}
                                {venue.city && `, ${venue.city}`}
                                {venue.state && `, ${venue.state}`}
                                {venue.zipCode && ` ${venue.zipCode}`}
                              </p>
                            )}
                            <p className={styles.venueId}>ID: {venue.id}</p>
                          </div>
                          <div className={styles.venueActions}>
                            <button
                              onClick={() => handleEditVenue(venue, client.id)}
                              className={styles.editButton}
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteVenue(client.id, venue.id)}
                              className={styles.deleteButton}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptyVenues}>
                      <MapPin size={32} className={styles.emptyIcon} />
                      <p>No venues yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
