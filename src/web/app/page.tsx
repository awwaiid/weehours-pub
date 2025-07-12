'use client';

import { useState } from 'react';
import AuthForm from '../components/AuthForm';
import Dashboard from '../components/Dashboard';

interface User {
  sessionId: string
  username: string
  userId?: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  const handleAuth = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <main className="min-h-screen bg-mud-dark">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-mud-green mb-2">
            WeeHours MUD Client
          </h1>
          <p className="text-mud-cyan">
            Web-based interface for zeehours.net
          </p>
        </header>

        {!user ? (
          <AuthForm onAuth={handleAuth} />
        ) : (
          <Dashboard user={user} onLogout={handleLogout} />
        )}
      </div>
    </main>
  );
}