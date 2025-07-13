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

    // Set up WebSocket connection for real-time updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onopen = () => {
      console.log('Dashboard WebSocket connected');
      ws.send(JSON.stringify({ type: 'authenticate', sessionId: user.sessionId }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_message') {
          // Reload messages when new message arrives
          loadRecentMessages();
        } else if (data.type === 'status_change') {
          // Update connection status in real-time
          setConnectionStatus(data.status);
        }
      } catch (error) {
        console.error('Dashboard WebSocket message parse error:', error);
      }
    };
    
    ws.onclose = (event) => {
      console.log('Dashboard WebSocket disconnected:', event.code, event.reason);
      // Don't attempt to reconnect automatically from Dashboard
    };
    
    ws.onerror = (error) => {
      console.error('Dashboard WebSocket error:', error);
    };

    // Cleanup on component unmount
    return () => {
      ws.close();
    };
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
    <div className="mobile-viewport flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-2 sm:p-4 bg-mud-dark border-b border-mud-bronze">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-mud-green">
            Greetings, {user.username}
          </h2>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <StatusBar status={connectionStatus} compact={true} />
          <ViewToggle 
            currentView={currentView} 
            onViewChange={setCurrentView}
          />
          <button
            onClick={handleLogout}
            className="mud-button text-xs sm:text-sm px-2 sm:px-4"
          >
Logout
          </button>
        </div>
      </div>


      {/* Main Chat/Terminal Area - Takes remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {currentView === 'terminal' ? (
          <MudTerminal messages={messages} />
        ) : (
          <ChatView sessionId={user.sessionId} />
        )}
      </div>
      
      {/* Command Input - Fixed at bottom */}
      <div className="p-4 bg-mud-dark border-t border-mud-bronze">
        <CommandInput
          onSendCommand={handleSendCommand}
          disabled={!connectionStatus.isConnected}
        />
      </div>
    </div>
  );
}