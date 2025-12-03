import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Cpu, Boxes, Building2, Users, Layout, Power, Clapperboard, LogOut, User, Sun, Activity, Puzzle, MapPin, Settings, Zap, ChevronDown } from 'lucide-react';
import { getCurrentUser, logout } from '../ProtectedRoute';
import { useRoomContext } from '../../contexts/RoomContext';
import RoomSelector from '../RoomSelector';
import './DashboardLayout.css';

export function DashboardLayout() {
  const currentUser = getCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedClientName, selectedVenueName, selectedRoomId, selectedRoomName, hasRoomSelected } = useRoomContext();
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [hasCheckedInitialRoom, setHasCheckedInitialRoom] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-open room selector on first load if no room selected
  useEffect(() => {
    if (!hasCheckedInitialRoom) {
      setHasCheckedInitialRoom(true);
      if (!hasRoomSelected) {
        console.log('[DashboardLayout] No room selected, opening selector');
        setShowRoomSelector(true);
      }
    }
  }, [hasCheckedInitialRoom, hasRoomSelected]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  // Determine active category based on current path
  const isControlActive = location.pathname.includes('/power-control') || location.pathname.includes('/lighting');
  const isSetupActive = location.pathname.includes('/scenes') || location.pathname.includes('/puzzles') || 
                        location.pathname.includes('/controllers') || location.pathname.includes('/devices');
  const isAdminActive = location.pathname.includes('/rooms') || location.pathname.includes('/clients') || 
                        location.pathname.includes('/users');

  const toggleDropdown = (category: string) => {
    setOpenDropdown(openDropdown === category ? null : category);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpenDropdown(null);
  };

  return (
    <div className="dashboard-layout">
      <div className="neural-grid" />
      <div className="scan-line" />

      {/* Top Navigation Bar */}
      <header className="top-navbar">
        <div className="navbar-brand">
          <h1 className="logo-text text-glow">SENTIENT</h1>
          <span className="logo-subtitle">Neural Engine</span>
        </div>

        {/* Client & Room Info */}
        <div className="context-display">
          {hasRoomSelected ? (
            <>
              <div className="client-badge">
                <Building2 size={14} />
                <span>{selectedClientName}</span>
              </div>
              <div className="context-divider">›</div>
              <button 
                className="room-selector-btn"
                onClick={() => setShowRoomSelector(true)}
                title="Change Room"
              >
                <MapPin size={14} />
                <span>{selectedVenueName} - {selectedRoomName}</span>
              </button>
            </>
          ) : (
            <button 
              className="room-selector-btn pulse"
              onClick={() => setShowRoomSelector(true)}
              title="Select Room"
            >
              <MapPin size={16} />
              <span>Select Room</span>
            </button>
          )}
        </div>

        <nav className="navbar-nav" ref={dropdownRef}>
          {/* Monitor - Always visible */}
          <NavLink to="/monitor" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Activity size={18} />
            <span>Monitor</span>
          </NavLink>

          {hasRoomSelected && (
            <>
              <div className="nav-divider" />

              {/* Category: Control - with Dropdown */}
              <div className="nav-dropdown">
                <button 
                  className={isControlActive ? 'nav-link nav-category active' : 'nav-link nav-category'}
                  onClick={() => toggleDropdown('control')}
                >
                  <Zap size={18} />
                  <span>Control</span>
                  <ChevronDown size={14} className={openDropdown === 'control' ? 'chevron-rotated' : ''} />
                </button>
                {openDropdown === 'control' && (
                  <div className="dropdown-menu">
                    <button 
                      className={location.pathname.includes('/power-control') ? 'dropdown-item active' : 'dropdown-item'}
                      onClick={() => handleNavigation(`/room/${selectedRoomId}/power-control`)}
                    >
                      <Power size={16} />
                      <span>Power</span>
                    </button>
                    <button 
                      className={location.pathname.includes('/lighting') ? 'dropdown-item active' : 'dropdown-item'}
                      onClick={() => handleNavigation(`/room/${selectedRoomId}/lighting`)}
                    >
                      <Sun size={16} />
                      <span>Lighting</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Category: Setup - with Dropdown */}
              <div className="nav-dropdown">
                <button 
                  className={isSetupActive ? 'nav-link nav-category active' : 'nav-link nav-category'}
                  onClick={() => toggleDropdown('setup')}
                >
                  <Settings size={18} />
                  <span>Setup</span>
                  <ChevronDown size={14} className={openDropdown === 'setup' ? 'chevron-rotated' : ''} />
                </button>
                {openDropdown === 'setup' && (
                  <div className="dropdown-menu">
                    <button 
                      className={location.pathname.includes('/scenes') ? 'dropdown-item active' : 'dropdown-item'}
                      onClick={() => handleNavigation(`/room/${selectedRoomId}/scenes`)}
                    >
                      <Clapperboard size={16} />
                      <span>Scenes</span>
                    </button>
                    <button 
                      className={location.pathname.includes('/puzzles') ? 'dropdown-item active' : 'dropdown-item'}
                      onClick={() => handleNavigation(`/room/${selectedRoomId}/puzzles`)}
                    >
                      <Puzzle size={16} />
                      <span>Puzzles</span>
                    </button>
                    <button 
                      className={location.pathname.includes('/controllers') ? 'dropdown-item active' : 'dropdown-item'}
                      onClick={() => handleNavigation(`/room/${selectedRoomId}/controllers`)}
                    >
                      <Cpu size={16} />
                      <span>Controllers</span>
                    </button>
                    <button 
                      className={location.pathname.includes('/devices') ? 'dropdown-item active' : 'dropdown-item'}
                      onClick={() => handleNavigation(`/room/${selectedRoomId}/devices`)}
                    >
                      <Boxes size={16} />
                      <span>Devices</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="nav-divider" />

          {/* Category: Admin - with Dropdown */}
          <div className="nav-dropdown">
            <button 
              className={isAdminActive ? 'nav-link nav-category active' : 'nav-link nav-category'}
              onClick={() => toggleDropdown('admin')}
            >
              <Building2 size={18} />
              <span>Admin</span>
              <ChevronDown size={14} className={openDropdown === 'admin' ? 'chevron-rotated' : ''} />
            </button>
            {openDropdown === 'admin' && (
              <div className="dropdown-menu">
                <button 
                  className={location.pathname.includes('/clients') ? 'dropdown-item active' : 'dropdown-item'}
                  onClick={() => handleNavigation('/clients')}
                >
                  <Building2 size={16} />
                  <span>Clients</span>
                </button>
                <button 
                  className={location.pathname.includes('/rooms') ? 'dropdown-item active' : 'dropdown-item'}
                  onClick={() => handleNavigation('/rooms')}
                >
                  <Layout size={16} />
                  <span>Rooms</span>
                </button>
                <button 
                  className={location.pathname === '/users' ? 'dropdown-item active' : 'dropdown-item'}
                  onClick={() => handleNavigation('/users')}
                >
                  <Users size={16} />
                  <span>Users</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="navbar-info">
          {currentUser && (
            <div className="user-info">
              <User size={16} />
              <span className="user-email">{currentUser.email}</span>
              <span className="user-role">{currentUser.role}</span>
            </div>
          )}
          <button onClick={handleLogout} className="logout-button" title="Logout">
            <LogOut size={16} />
          </button>
          <span className="version-label">v1.0.0</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Room Selector Modal */}
      <RoomSelector 
        isOpen={showRoomSelector} 
        onClose={() => setShowRoomSelector(false)} 
      />
    </div>
  );
}
