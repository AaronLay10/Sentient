import { useState, useEffect } from 'react';
import { Users as UsersIcon, Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { getAuthToken } from '../components/ProtectedRoute';
import styles from './Users.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  role: 'OWNER' | 'GM' | 'TECH' | 'VIEWER';
  clientId: string;
  created_at: string;
}

const ROLE_COLORS = {
  OWNER: '#f59e0b',
  GM: '#6366f1',
  TECH: '#22d3ee',
  VIEWER: '#52525b',
};

const ROLE_LABELS = {
  OWNER: 'Owner',
  GM: 'Game Master',
  TECH: 'Technician',
  VIEWER: 'Viewer',
};

export function Users() {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'GM' as 'OWNER' | 'GM' | 'TECH' | 'VIEWER',
    clientId: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch users for each client
        const allUsers: User[] = [];
        for (const client of clientsData) {
          const usersRes = await fetch(`${API_URL}/clients/${client.id}/users`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            allUsers.push(...usersData);
          }
        }
        setUsers(allUsers);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const token = getAuthToken();
      const url = editingId
        ? `${API_URL}/users/${editingId}`
        : `${API_URL}/clients/${formData.clientId}/users`;

      const method = editingId ? 'PATCH' : 'POST';

      // Only send password on create or if changed
      // Don't send clientId in body - it's in the URL path
      const payload = editingId
        ? { email: formData.email, role: formData.role }
        : { email: formData.email, password: formData.password, role: formData.role };

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
        setFormData({ email: '', password: '', role: 'GM', clientId: '' });
        setEditingId(null);
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        let errorMessage = 'Unknown error';

        // Handle nested message structure from NestJS
        if (errorData.message) {
          if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message.join(', ');
          } else if (typeof errorData.message === 'object' && errorData.message.message) {
            errorMessage = errorData.message.message;
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else {
          errorMessage = `Error: ${response.status} ${response.statusText}`;
        }

        console.log('API Error:', errorData); // Debug log
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      setError('Network error: Failed to connect to server');
    }
  };

  const handleEdit = (user: User) => {
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      clientId: user.clientId,
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ email: '', password: '', role: 'GM', clientId: '' });
    setEditingId(null);
    setError(null);
  };

  const getClientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name || 'Unknown';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.icon}>
            <UsersIcon size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Users</h1>
            <p className={styles.subtitle}>Manage user accounts and permissions</p>
          </div>
        </div>

        <button onClick={() => setShowForm(true)} className={styles.addButton}>
          <Plus size={16} />
          Add User
        </button>
      </div>

      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>
            {editingId ? 'Edit User' : 'New User'}
          </h3>
          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#ef4444',
              fontSize: '0.875rem',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Client</label>
              <select
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                required
                disabled={!!editingId}
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
              <label className={styles.label}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className={styles.input}
                placeholder="user@example.com"
              />
            </div>

            {!editingId && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingId}
                  className={styles.input}
                  placeholder="••••••••"
                />
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                required
                className={styles.select}
              >
                <option value="OWNER">Owner - Full access</option>
                <option value="GM">Game Master - Run games</option>
                <option value="TECH">Technician - Manage hardware</option>
                <option value="VIEWER">Viewer - Read-only</option>
              </select>
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
          <p>Loading users...</p>
        </div>
      ) : users.length === 0 ? (
        <div className={styles.emptyState}>
          <UsersIcon size={48} className={styles.emptyIcon} />
          <p className={styles.emptyText}>No users yet</p>
          <p className={styles.emptySubtext}>Create your first user to get started</p>
        </div>
      ) : (
        <div className={styles.usersList}>
          {users.map((user) => (
            <div key={user.id} className={styles.userCard}>
              <div className={styles.userInfo}>
                <div className={styles.userHeader}>
                  <h3 className={styles.userEmail}>{user.email}</h3>
                  <span
                    className={styles.roleBadge}
                    style={{
                      backgroundColor: `${ROLE_COLORS[user.role]}33`,
                      border: `1px solid ${ROLE_COLORS[user.role]}`,
                      color: ROLE_COLORS[user.role],
                    }}
                  >
                    <Shield size={12} />
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
                <p className={styles.userClient}>{getClientName(user.clientId)}</p>
                <p className={styles.userId}>ID: {user.id}</p>
              </div>
              <div className={styles.userActions}>
                <button onClick={() => handleEdit(user)} className={styles.editButton} title="Edit">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(user.id)} className={styles.deleteButton} title="Delete">
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
