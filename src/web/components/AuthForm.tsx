'use client'

import { useState } from 'react'

interface AuthFormProps {
  onAuth: (user: { sessionId: string; username: string; userId?: string }) => void
}

interface FormData {
  username: string
  password: string
  userId?: string
}

export default function AuthForm({ onAuth }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    userId: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const payload = isLogin 
        ? { sessionId: formData.userId, password: formData.password }
        : { userId: formData.userId, username: formData.username, password: formData.password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        onAuth({
          sessionId: data.sessionId,
          username: data.username,
          userId: formData.userId
        })
      } else {
        setError(data.error || 'Authentication failed')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mud-card">
        <div className="flex mb-6">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 text-sm font-mono border-b-2 ${
              isLogin 
                ? 'border-mud-green text-mud-green' 
                : 'border-transparent text-gray-400 hover:text-mud-green'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 text-sm font-mono border-b-2 ${
              !isLogin 
                ? 'border-mud-green text-mud-green' 
                : 'border-transparent text-gray-400 hover:text-mud-green'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
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
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label htmlFor="userId" className="block text-sm text-mud-cyan mb-1">
              {isLogin ? 'Session ID' : 'User ID (optional)'}
            </label>
            <input
              type="text"
              id="userId"
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              className="mud-input"
              placeholder={isLogin ? "Your session ID" : "Optional identifier"}
              required={isLogin}
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
            {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-400">
          <p className="mb-2">
            <strong className="text-mud-cyan">Note:</strong> Enter your WeeHours MUD credentials.
          </p>
          <p>
            For new users: Register first, then use your session ID to login on other devices.
          </p>
        </div>
      </div>
    </div>
  )
}