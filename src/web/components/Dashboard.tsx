'use client';

import { useState, useEffect, useRef } from 'react';
import MudTerminal from './MudTerminal';
import CommandInput from './CommandInput';
import StatusBar from './StatusBar';

interface User {
  sessionId: string
  username: string
  userId?: string
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
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Load recent messages
    loadRecentMessages();
    
    // Setup WebSocket connection
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user.sessionId]);

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

  const setupWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Authenticate
      ws.send(JSON.stringify({
        type: 'authenticate',
        sessionId: user.sessionId
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'authenticated') {
        if (data.success) {
          console.log('WebSocket authenticated');
        } else {
          console.error('WebSocket authentication failed:', data.error);
        }
      } else if (data.type === 'mud_message') {
        setMessages(prev => [...prev, {
          content: data.content,
          isOutgoing: data.isOutgoing,
          timestamp: data.timestamp
        }]);
      } else if (data.type === 'mud_status') {
        setConnectionStatus(data.status);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Try to reconnect after 3 seconds
      setTimeout(setupWebSocket, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/mud/connect', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to connect to MUD');
      }
    } catch (error) {
      alert('Network error while connecting to MUD');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/mud/disconnect', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to disconnect from MUD');
      }
    } catch (error) {
      alert('Network error while disconnecting from MUD');
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
            Welcome, {user.username}
          </h2>
          <p className="text-mud-cyan text-sm">
            Session: {user.sessionId.substring(0, 8)}...
          </p>
        </div>
        <div className="space-x-4">
          {!connectionStatus.isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="mud-button"
            >
              {isConnecting ? 'Connecting...' : 'Connect to MUD'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="mud-button"
            >
              Disconnect
            </button>
          )}
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Terminal - Takes most space */}
        <div className="lg:col-span-3">
          <MudTerminal messages={messages} />
          <div className="mt-4">
            <CommandInput
              onSendCommand={handleSendCommand}
              disabled={!connectionStatus.isConnected}
            />
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-4">
          <div className="mud-card">
            <h3 className="text-lg font-bold text-mud-green mb-3">
              Connection Info
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-mud-cyan">State:</span>{' '}
                <span className={`mud-status-${connectionStatus.state}`}>
                  {connectionStatus.state}
                </span>
              </div>
              <div>
                <span className="text-mud-cyan">Login:</span>{' '}
                <span className="text-mud-yellow">
                  {connectionStatus.loginState}
                </span>
              </div>
              <div>
                <span className="text-mud-cyan">Messages:</span>{' '}
                <span className="text-white">
                  {connectionStatus.messageCount}
                </span>
              </div>
            </div>
          </div>

          <div className="mud-card">
            <h3 className="text-lg font-bold text-mud-green mb-3">
              Quick Commands
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => handleSendCommand('look')}
                disabled={!connectionStatus.isConnected}
                className="w-full mud-button text-xs"
              >
                Look
              </button>
              <button
                onClick={() => handleSendCommand('who')}
                disabled={!connectionStatus.isConnected}
                className="w-full mud-button text-xs"
              >
                Who
              </button>
              <button
                onClick={() => handleSendCommand('inventory')}
                disabled={!connectionStatus.isConnected}
                className="w-full mud-button text-xs"
              >
                Inventory
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}