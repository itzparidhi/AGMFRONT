import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

//   return (
//     <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden">
//       {/* Background gradients */}
//       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
//         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]"></div>
//         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px]"></div>
//       </div>

//       <div className="w-full max-w-md p-10 space-y-8 glass-panel shadow-2xl relative z-10 mx-4">
//         <div className="text-center">
//           <h1 className="text-4xl font-display font-bold text-white mb-2 drop-shadow-md">Welcome Back</h1>
//           <p className="text-zinc-400 text-sm">Sign in to your AI Pipeline Dashboard</p>
//         </div>

//         {error && <div className="p-4 text-sm font-medium text-red-200 bg-red-900/30 border border-red-500/30 rounded-lg backdrop-blur-sm shadow-inner">{error}</div>}

//         <form onSubmit={handleLogin} className="space-y-6">
//           <div className="space-y-2">
//             <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Email</label>
//             <input
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 focus:outline-none transition-all placeholder-zinc-600 text-white shadow-inner"
//               placeholder="name@example.com"
//               required
//             />
//           </div>
//           <div className="space-y-2">
//             <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Password</label>
//             <input
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 focus:outline-none transition-all placeholder-zinc-600 text-white shadow-inner"
//               placeholder="••••••••"
//               required
//             />
//           </div>
//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full px-4 py-3.5 font-bold text-white glass-button rounded-xl shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all active:scale-[0.98] uppercase tracking-wide text-sm"
//           >
//             {loading ? 'Signing in...' : 'Sign In'}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-full max-w-md p-8 space-y-6 glass-panel rounded-lg shadow-glass">
        <h2 className="text-2xl font-bold text-center">Sign In</h2>
        {error && <div className="p-3 text-sm text-red-500 bg-red-900/20 rounded">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 mt-1 bg-zinc-900/50 border border-zinc-700 rounded focus:ring-2 focus:ring-white/50 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mt-1 bg-zinc-900/50 border border-zinc-700 rounded focus:ring-2 focus:ring-white/50 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 font-bold text-white glass-button hover:bg-white/10 rounded disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};