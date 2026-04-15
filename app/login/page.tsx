'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Check your email for the confirmation link!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else router.push('/dashboard'); // Route to your Tournament Hub!
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            {isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            {isSignUp ? 'Launch your tournament ecosystem.' : 'Access your command center.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-teal-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:border-teal-500 outline-none"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-4 rounded-xl mt-4 transition-all"
          >
            {loading ? 'Authenticating...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-bold text-slate-500 hover:text-teal-500 transition-colors"
          >
            {isSignUp ? 'Already have an account? Log in.' : 'Need an account? Sign up.'}
          </button>
        </div>
      </div>
    </div>
  );
}