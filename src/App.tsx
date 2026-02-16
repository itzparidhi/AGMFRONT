import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { EpisodeList } from './pages/EpisodeList';
import { Timeline } from './pages/Timeline';
import { SceneDetail } from './pages/SceneDetail';
import { Workstation } from './pages/Workstation';
import { MasterView } from './pages/MasterView';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-white">Loading...</div>;
  if (!session) return <Navigate to="/login" />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/project/:projectId" element={
              <ProtectedRoute>
                <EpisodeList />
              </ProtectedRoute>
            } />
            <Route path="/project/:projectId/episode/:episodeId" element={
              <ProtectedRoute>
                <Timeline />
              </ProtectedRoute>
            } />
            <Route path="/project/:projectId/scene/:sceneId" element={
              <ProtectedRoute>
                <SceneDetail />
              </ProtectedRoute>
            } />
            <Route path="/project/:projectId/master" element={
              <ProtectedRoute>
                <MasterView />
              </ProtectedRoute>
            } />
            <Route path="/shot/:shotId" element={
              <ProtectedRoute>
                <Workstation />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
