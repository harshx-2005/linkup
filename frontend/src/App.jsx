import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SplashLoader = () => (
  <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center relative overflow-hidden select-none">
    {/* Aurora Background */}
    <div className="absolute top-[30%] left-[30%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
    <div className="absolute bottom-[30%] right-[30%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

    <div className="relative flex flex-col items-center z-10 space-y-6">
      {/* Pulse Logo */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-ping opacity-75"></div>
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl border border-white/10 animate-bounce">
          💬
        </div>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
          LinkUp
        </h1>
        <div className="flex items-center justify-center gap-1.5 text-gray-500 text-xs tracking-widest uppercase">
          <svg className="animate-spin h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-semibold">Securing Connection</span>
        </div>
      </div>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <SplashLoader />;

  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <ToastContainer theme="dark" position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/settings" element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute>
                <AdminDashboard />
              </PrivateRoute>
            } />
            <Route path="/" element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            } />
          </Routes>
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
