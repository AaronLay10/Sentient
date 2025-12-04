import { useMemo, useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { Cpu, Boxes, Building2, Users, Layout, Power, Clapperboard, LogOut, User, Sun, Activity, Puzzle, MapPin, Settings, Zap, AlertCircle, LayoutGrid, Shield, X, ChevronDown } from 'lucide-react';
import { getCurrentUser, logout, isSentientAdmin, stopEmulating, startEmulating, getAuthToken } from '../ProtectedRoute';
import { useRoomContext } from '../../contexts/RoomContext';
import { SentientEye } from '../SentientEye/SentientEye';
import './DashboardLayout.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Client {
  id: string;
  name: string;
}

// Page title mapping based on route
const PAGE_TITLES: Record<string, string> = {
  '/overview': 'Room Overview',
  '/monitor': 'Room Monitor',
  '/clients': 'Clients',
  '/rooms': 'Rooms',
  '/users': 'Users',
  '/settings': 'Settings',
  'scenes': 'Scene Editor',
  'puzzles': 'Puzzle Editor',
  'controllers': 'Controllers',
  'devices': 'Devices',
  'power-control': 'Power Control',
  'lighting': 'Lighting Control',
};

export function DashboardLayout() {
  const currentUser = getCurrentUser();
  const location = useLocation();
  const { selectedClientName, selectedRoomId, selectedRoomName, hasRoomSelected, clearRoomContext } = useRoomContext();

  // Check user role
  const isAdmin = isSentientAdmin();
  const isEmulating = currentUser?.emulatingClientId !== undefined;

  // Client selector state for Sentient admins
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientSelector, setShowClientSelector] = useState(false);

  // Get display name from email
  const getUserDisplayName = () => {
    if (!currentUser?.email) return 'User';
    const emailPart = currentUser.email.split('@')[0];
    // Convert email to name format (aaron.layton -> Aaron Layton)
    return emailPart
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  // Get client display name
  const getClientDisplayName = () => {
    if (isEmulating && currentUser?.emulatingClientName) {
      return currentUser.emulatingClientName;
    }
    if (isAdmin) {
      return 'Sentient Engine AI';
    }
    return selectedClientName || 'Unknown Client';
  };

  // Handle client selection for emulation
  const handleSelectClient = (client: Client) => {
    startEmulating(client.id, client.name);
    setShowClientSelector(false);
    clearRoomContext();
    window.location.href = '/overview';
  };

  // Fetch clients for Sentient admin
  useEffect(() => {
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
          // Filter out __SENTIENT__ internal client
          setClients(data.filter((c: Client) => !c.name.startsWith('__')));
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      }
    };

    if (isAdmin) {
      fetchClients();
    }
  }, [isAdmin]);

  // Handle stop emulating
  const handleStopEmulating = () => {
    stopEmulating();
    window.location.href = '/overview';
  };

  // Get current page title based on route
  const pageTitle = useMemo(() => {
    const path = location.pathname;

    // Check exact matches first
    if (PAGE_TITLES[path]) {
      return PAGE_TITLES[path];
    }

    // Check for room-specific routes (e.g., /room/123/scenes)
    const roomRouteMatch = path.match(/\/room\/[^/]+\/([^/]+)/);
    if (roomRouteMatch) {
      const routePart = roomRouteMatch[1];
      return PAGE_TITLES[routePart] || 'Dashboard';
    }

    return 'Dashboard';
  }, [location.pathname]);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <div className="dashboard-layout">
      <div className="neural-grid" />

      {/* Left Sidebar */}
      <aside className="sidebar">
        {/* Brand Header - Eye + Text */}
        <div className="sidebar-brand">
          <div className="brand-eye-container">
            <SentientEye />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">SENTIENT</h1>
            <span className="brand-subtitle">Escape Room Neural Engine</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Overview - Always visible, entry point */}
          <NavLink to="/overview" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <LayoutGrid size={18} />
            <span>Overview</span>
          </NavLink>

          {/* Monitor - Always visible */}
          <NavLink to="/monitor" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Activity size={18} />
            <span>Monitor</span>
          </NavLink>

          {hasRoomSelected && (
            <>
              {/* Control Section */}
              <div className="nav-section">
                <div className="nav-section-title">
                  <Zap size={14} />
                  <span>Control</span>
                </div>
                <NavLink
                  to={`/room/${selectedRoomId}/power-control`}
                  className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                >
                  <Power size={18} />
                  <span>Power</span>
                </NavLink>
                <NavLink
                  to={`/room/${selectedRoomId}/lighting`}
                  className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                >
                  <Sun size={18} />
                  <span>Lighting</span>
                </NavLink>
              </div>

              {/* Setup Section */}
              <div className="nav-section">
                <div className="nav-section-title">
                  <Settings size={14} />
                  <span>Setup</span>
                </div>
                <NavLink
                  to={`/room/${selectedRoomId}/scenes`}
                  className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                >
                  <Clapperboard size={18} />
                  <span>Scenes</span>
                </NavLink>
                <NavLink
                  to={`/room/${selectedRoomId}/puzzles`}
                  className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                >
                  <Puzzle size={18} />
                  <span>Puzzles</span>
                </NavLink>
                <NavLink
                  to={`/room/${selectedRoomId}/controllers`}
                  className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                >
                  <Cpu size={18} />
                  <span>Controllers</span>
                </NavLink>
                <NavLink
                  to={`/room/${selectedRoomId}/devices`}
                  className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                >
                  <Boxes size={18} />
                  <span>Devices</span>
                </NavLink>
              </div>
            </>
          )}

          {/* Admin Section - Role-based visibility */}
          <div className="nav-section">
            <div className="nav-section-title">
              <Building2 size={14} />
              <span>Admin</span>
            </div>
            {/* Clients - Only visible to Sentient admins */}
            {isAdmin && (
              <NavLink
                to="/clients"
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <Building2 size={18} />
                <span>Clients</span>
              </NavLink>
            )}
            {/* Rooms - Visible to all */}
            <NavLink
              to="/rooms"
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            >
              <Layout size={18} />
              <span>Rooms</span>
            </NavLink>
            {/* Users - Visible to all */}
            <NavLink
              to="/users"
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            >
              <Users size={18} />
              <span>Users</span>
            </NavLink>
            {/* Settings - Visible to all */}
            <NavLink
              to="/settings"
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            >
              <Settings size={18} />
              <span>Settings</span>
            </NavLink>
          </div>
        </nav>

        {/* Footer with User Info and Client Selector */}
        <div className="sidebar-footer">
          {/* Client Context / Selector for Sentient Admins */}
          {isAdmin && (
            <div className="client-selector-container">
              <button
                className={`client-selector-button ${showClientSelector ? 'active' : ''}`}
                onClick={() => setShowClientSelector(!showClientSelector)}
              >
                <Building2 size={16} />
                <div className="client-selector-text">
                  <span className="client-selector-label">Working as</span>
                  <span className="client-selector-name">{getClientDisplayName()}</span>
                </div>
                <ChevronDown size={14} className={`client-selector-chevron ${showClientSelector ? 'rotated' : ''}`} />
              </button>

              {showClientSelector && (
                <div className="client-selector-dropdown">
                  <div className="client-selector-header">Select Client Environment</div>
                  {/* Option to work as Sentient (no emulation) */}
                  {isEmulating && (
                    <button
                      className="client-option sentient-option"
                      onClick={() => {
                        handleStopEmulating();
                      }}
                    >
                      <Shield size={14} />
                      <span>Sentient Engine AI</span>
                      <span className="client-option-badge">Admin</span>
                    </button>
                  )}
                  {/* Client list */}
                  {clients.map(client => (
                    <button
                      key={client.id}
                      className={`client-option ${currentUser?.emulatingClientId === client.id ? 'active' : ''}`}
                      onClick={() => handleSelectClient(client)}
                    >
                      <Building2 size={14} />
                      <span>{client.name}</span>
                      {currentUser?.emulatingClientId === client.id && (
                        <span className="client-option-badge">Current</span>
                      )}
                    </button>
                  ))}
                  {clients.length === 0 && (
                    <div className="client-option-empty">No clients available</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Info */}
          <div className="user-section">
            {currentUser && (
              <div className="user-info">
                <User size={16} />
                <div className="user-details">
                  <span className="user-name">{getUserDisplayName()}</span>
                  <span className="user-role">
                    {isAdmin ? 'Sentient Admin' : currentUser.role}
                  </span>
                </div>
              </div>
            )}
            <div className="footer-actions">
              <button onClick={handleLogout} className="logout-button" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Top Bar */}
      <div className="main-area">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h1 className="page-title">{pageTitle}</h1>

            {hasRoomSelected ? (
              <>
                <div className="top-bar-divider" />
                <Link to="/overview" className="room-context" title="Change Room">
                  <MapPin size={16} className="room-context-icon" />
                  <div className="room-context-text">
                    <span className="room-context-label">Active Room</span>
                    <span className="room-context-name">{selectedRoomName}</span>
                  </div>
                </Link>
              </>
            ) : (
              <>
                <div className="top-bar-divider" />
                <Link to="/overview" className="no-room-indicator" title="Select a Room">
                  <AlertCircle size={14} />
                  <span>Select a room</span>
                </Link>
              </>
            )}
          </div>

          <div className="top-bar-right">
            {/* Emulation Indicator - Subtle indicator when Sentient admin is emulating */}
            {isAdmin && isEmulating && (
              <div className="emulation-indicator">
                <Shield size={14} />
                <span>Emulating: {currentUser?.emulatingClientName}</span>
                <button
                  onClick={handleStopEmulating}
                  className="emulation-stop"
                  title="Stop Emulating"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <div className="client-badge">
              <Building2 size={14} className="client-badge-icon" />
              <span className="client-badge-name">
                {isAdmin ? 'Sentient Engine AI' : (selectedClientName || 'Unknown Client')}
              </span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
