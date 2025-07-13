'use client';

import { useState, useEffect } from 'react';
import AuthForm from '../components/AuthForm';
import Dashboard from '../components/Dashboard';
import { apiCall } from '../lib/api';

interface User {
  sessionId: string
  username: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check for existing authentication on page load
  useEffect(() => {
    const checkExistingAuth = async () => {
      try {
        const response = await apiCall('/api/auth/user');
        if (response.ok) {
          const userData = await response.json();
          setUser({
            sessionId: userData.sessionId,
            username: userData.username
          });
        }
      } catch (error) {
        console.log('No existing session found');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkExistingAuth();
  }, []);

  const handleAuth = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <main className="mobile-viewport bg-mud-dark overflow-hidden">
      {isCheckingAuth ? (
        <div className="container mx-auto px-4 py-8 h-full flex flex-col justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-mud-green mb-2">
              WeeHours Pub Chat
            </h1>
            <p className="text-mud-cyan">
              Checking for existing session...
            </p>
          </div>
        </div>
      ) : !user ? (
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