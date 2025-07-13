'use client';

import { useState } from 'react';
import { apiCall } from '../lib/api';

interface AuthFormProps {
  onAuth: (user: { sessionId: string; username: string }) => void
}

interface FormData {
  username: string
  password: string
}

export default function AuthForm({ onAuth }: AuthFormProps) {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload = { 
        username: formData.username, 
        password: formData.password 
      };

      const response = await apiCall('/api/auth/connect', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        onAuth({
          sessionId: data.sessionId,
          username: data.username
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

  const handleDebugSession = async () => {
    try {
      const response = await apiCall('/api/debug/session');
      const data = await response.json();
      setDebugInfo(JSON.stringify(data, null, 2));
    } catch (err) {
      setDebugInfo('Debug request failed: ' + err);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mud-card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm text-mud-cyan mb-1">
              Adventurer's Name
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="mud-input"
              placeholder="Enter your character's name"
              required
            />
          </div>


          <div>
            <label htmlFor="password" className="block text-sm text-mud-cyan mb-1">
              Secret Passphrase
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mud-input"
              placeholder="Enter your secret passphrase"
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
{isLoading ? 'Entering the realm...' : 'Enter the Pub'}
          </button>
        </form>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleDebugSession}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded text-sm"
          >
            Debug Session Info
          </button>
        </div>

        {debugInfo && (
          <div className="mt-4 p-3 bg-black border border-gray-600 rounded">
            <h4 className="text-sm font-bold text-mud-cyan mb-2">Debug Info:</h4>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
