'use client';

import { useState } from 'react';
import AuthForm from '../components/AuthForm';
import Dashboard from '../components/Dashboard';

interface User {
  sessionId: string
  username: string
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
    <main className="mobile-viewport bg-mud-dark overflow-hidden">
      {!user ? (
        <div className="container mx-auto px-4 py-8 h-full flex flex-col justify-center">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-mud-green mb-2">
              WeeHours Pub Chat
            </h1>
            <p className="text-mud-cyan">
              Scheming over pints with your pals
            </p>
          </header>
          <AuthForm onAuth={handleAuth} />
        </div>
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </main>
  );
}