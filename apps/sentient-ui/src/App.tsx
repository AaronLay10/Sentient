import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { RoomProvider } from './contexts/RoomContext';
import { Login } from './pages/Login';
import { RoomOverview } from './pages/RoomOverview';
import { SystemMonitor } from './pages/SystemMonitor';
import { SceneEditor } from './pages/SceneEditor';
import { PuzzleEditor } from './pages/PuzzleEditor';
import { Controllers } from './pages/Controllers';
import { Devices } from './pages/Devices';
import { Rooms } from './pages/Rooms';
import { Clients } from './pages/Clients';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { PowerControl } from './pages/PowerControl';
import { LightingControl } from './pages/LightingControl';
import { LightingKiosk } from './pages/LightingKiosk';
import './styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000, // Real-time updates every 5 seconds
      refetchOnWindowFocus: true,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RoomProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes - No Auth Required */}
            <Route path="/login" element={<Login />} />
            <Route path="/kiosk/lighting" element={<LightingKiosk />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Default landing page - Room Overview */}
              <Route index element={<Navigate to="/overview" replace />} />
              <Route path="overview" element={<RoomOverview />} />
              <Route path="monitor" element={<SystemMonitor />} />

              {/* Room-scoped routes */}
              <Route path="room/:roomId/scenes" element={<SceneEditor />} />
              <Route path="room/:roomId/puzzles" element={<PuzzleEditor />} />
              <Route path="room/:roomId/controllers" element={<Controllers />} />
              <Route path="room/:roomId/devices" element={<Devices />} />
              <Route path="room/:roomId/power-control" element={<PowerControl />} />
              <Route path="room/:roomId/lighting" element={<LightingControl />} />

              {/* Admin/Global routes */}
              <Route path="rooms" element={<Rooms />} />
              <Route path="clients" element={<Clients />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<Settings />} />

              {/* Legacy redirects - go to overview */}
              <Route path="scenes" element={<Navigate to="/overview" replace />} />
              <Route path="puzzles" element={<Navigate to="/overview" replace />} />
              <Route path="controllers" element={<Navigate to="/overview" replace />} />
              <Route path="devices" element={<Navigate to="/overview" replace />} />
              <Route path="power-control" element={<Navigate to="/overview" replace />} />
              <Route path="lighting" element={<Navigate to="/overview" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </RoomProvider>
    </QueryClientProvider>
  );
}

export default App;
