import { Outlet, NavLink } from 'react-router-dom';
import { Eye, Cpu, Boxes, Building2, Users, Layout, Power, Clapperboard, LogOut, User, Network, Sun } from 'lucide-react';
import { getCurrentUser, logout } from '../ProtectedRoute';
import './DashboardLayout.css';

export function DashboardLayout() {
  const currentUser = getCurrentUser();

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
    }
  };

  return (
    <div className="dashboard-layout circuit-bg">
      <div className="neural-grid" />
      <div className="scan-line" />

      {/* Top Navigation Bar */}
      <header className="top-navbar">
        <div className="navbar-brand">
          <h1 className="logo-text text-glow">SENTIENT</h1>
          <span className="logo-subtitle">Neural Engine</span>
        </div>

        <nav className="navbar-nav">
          <NavLink to="/overview" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Eye size={18} />
            <span>Overview</span>
          </NavLink>

          <NavLink to="/topology" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Network size={18} />
            <span>Topology</span>
          </NavLink>

          <NavLink to="/power-control" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Power size={18} />
            <span>Power</span>
          </NavLink>

          <NavLink to="/lighting" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Sun size={18} />
            <span>Lighting</span>
          </NavLink>

          <div className="nav-divider" />

          <NavLink to="/scenes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Clapperboard size={18} />
            <span>Scenes</span>
          </NavLink>

          <NavLink to="/controllers" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Cpu size={18} />
            <span>Controllers</span>
          </NavLink>

          <NavLink to="/devices" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Boxes size={18} />
            <span>Devices</span>
          </NavLink>

          <NavLink to="/rooms" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Layout size={18} />
            <span>Rooms</span>
          </NavLink>

          <div className="nav-divider" />

          <NavLink to="/clients" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Building2 size={18} />
            <span>Clients</span>
          </NavLink>

          <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <Users size={18} />
            <span>Users</span>
          </NavLink>
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
    </div>
  );
}
