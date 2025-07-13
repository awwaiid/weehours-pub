'use client';

import { useState, useEffect } from 'react';
import MudTerminal from './MudTerminal';
import CommandInput from './CommandInput';
import StatusBar from './StatusBar';
import ViewToggle from './ViewToggle';
import ChatView from './ChatView';

interface User {
  sessionId: string
  username: string
}

interface RawMudMessage {
  content: string;
  direction: 'incoming' | 'outgoing';
  timestamp: string;
}

interface DashboardProps {
  user: User
  onLogout: () => void
}

interface MudMessage {
  content: string
  isOutgoing: boolean
  timestamp: string
}

interface ConnectionStatus {
  state: string
  loginState: string
  isConnected: boolean
  messageCount: number
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [messages, setMessages] = useState<MudMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: 'disconnected',
    loginState: 'waiting',
    isConnected: false,
    messageCount: 0
  });
  const [currentView, setCurrentView] = useState<'terminal' | 'chat'>('chat');

  useEffect(() => {
    // Initial data load
    fetchUpdates();

    // Poll for updates every 3 seconds
    const intervalId = setInterval(fetchUpdates, 3000);

    // Cleanup on component unmount
    return () => clearInterval(intervalId);
  }, [user.sessionId]);

  const fetchUpdates = () => {
    loadRecentMessages();
    loadConnectionStatus();
  };

  const loadConnectionStatus = async () => {
    try {
      const response = await fetch('/api/mud/status', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to load connection status:', error);
    }
  };

  const loadRecentMessages = async () => {
    try {
      const response = await fetch('/api/mud/messages?limit=50', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const formattedMessages = data.messages.map((msg: RawMudMessage) => ({
          content: msg.content,
          isOutgoing: msg.direction === 'outgoing',
          timestamp: msg.timestamp
        }));
        setMessages(formattedMessages.reverse());
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };


  const handleSendCommand = async (command: string) => {
    try {
      const response = await fetch('/api/mud/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ command })
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to send command:', data.error);
      }
    } catch (error) {
      console.error('Network error while sending command:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    onLogout();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-mud-green">
            Greetings, {user.username}
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          <ViewToggle 
            currentView={currentView} 
            onViewChange={setCurrentView}
          />
          <button
            onClick={handleLogout}
            className="mud-button"
          >
Logout
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar status={connectionStatus} />

      {/* Main Interface */}
      <div className="w-full">
        {/* Terminal or Chat View */}
        {currentView === 'terminal' ? (
          <MudTerminal messages={messages} />
        ) : (
          <ChatView sessionId={user.sessionId} />
        )}
        
        <div className="mt-4">
          <CommandInput
            onSendCommand={handleSendCommand}
            disabled={!connectionStatus.isConnected}
          />
        </div>
      </div>
    </div>
  );
}