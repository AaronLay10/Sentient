import { useState, useEffect } from 'react';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { getAuthToken } from '../components/ProtectedRoute';
import styles from './Clients.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Client {
  id: string;
  name: string;
  created_at: string;
}

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
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
        setClients(data);
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
              <div className={styles.clientInfo}>
                <h3 className={styles.clientName}>{client.name}</h3>
                <p className={styles.clientId}>ID: {client.id}</p>
                <p className={styles.clientDate}>
                  Created: {new Date(client.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className={styles.clientActions}>
                <button onClick={() => handleEdit(client)} className={styles.editButton} title="Edit">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(client.id)} className={styles.deleteButton} title="Delete">
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
