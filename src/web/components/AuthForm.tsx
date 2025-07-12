'use client';

import { useState } from 'react';

interface AuthFormProps {
  onAuth: (user: { sessionId: string; username: string; userId?: string }) => void
}

interface FormData {
  username: string
  password: string
  userId?: string
}

export default function AuthForm({ onAuth }: AuthFormProps) {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    userId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload = { 
        userId: formData.userId, 
        username: formData.username, 
        password: formData.password 
      };

      const response = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        onAuth({
          sessionId: data.sessionId,
          username: data.username,
          userId: formData.userId
        });
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mud-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm text-mud-cyan mb-1">
              MUD Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="mud-input"
              placeholder="Your character name in WeeHours"
              required
            />
          </div>

          <div>
            <label htmlFor="userId" className="block text-sm text-mud-cyan mb-1">
              User ID (optional)
            </label>
            <input
              type="text"
              id="userId"
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              className="mud-input"
              placeholder="Optional identifier"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-mud-cyan mb-1">
              MUD Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mud-input"
              placeholder="Your WeeHours password"
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-400 rounded p-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mud-button"
          >
            {isLoading ? 'Connecting...' : 'Connect to WeeHours'}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-400">
          <p className="mb-2">
            <strong className="text-mud-cyan">Note:</strong> Enter your WeeHours MUD credentials.
          </p>
          <p>
            If you have an existing session, you'll be connected to it. Otherwise, a new session will be created.
          </p>
        </div>
      </div>
    </div>
  );
}