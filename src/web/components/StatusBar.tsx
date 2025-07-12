'use client';

interface ConnectionStatus {
  state: string
  loginState: string
  isConnected: boolean
  messageCount: number
}

interface StatusBarProps {
  status: ConnectionStatus
}

export default function StatusBar({ status }: StatusBarProps) {
  const getStatusColor = (state: string) => {
    switch (state) {
      case 'connected':
        return 'mud-status-connected';
      case 'connecting':
      case 'login':
        return 'mud-status-connecting';
      case 'error':
        return 'mud-status-error';
      default:
        return 'mud-status-disconnected';
    }
  };

  const getStatusIcon = (state: string) => {
    switch (state) {
      case 'connected':
        return '●';
      case 'connecting':
      case 'login':
        return '◐';
      case 'error':
        return '✕';
      default:
        return '○';
    }
  };

  const getStatusMessage = () => {
    if (status.state === 'connected') {
      return 'Connected to WeeHours MUD';
    } else if (status.state === 'connecting') {
      return 'Establishing connection...';
    } else if (status.state === 'login') {
      if (status.loginState === 'username') {
        return 'Sending username...';
      } else if (status.loginState === 'password') {
        return 'Authenticating...';
      } else {
        return 'Logging in...';
      }
    } else if (status.state === 'error') {
      return 'Connection error';
    } else {
      return 'Not connected';
    }
  };

  return (
    <div className="mud-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className={`text-lg ${getStatusColor(status.state)}`}>
            {getStatusIcon(status.state)}
          </span>
          <div>
            <div className={`font-semibold ${getStatusColor(status.state)}`}>
              {status.state.charAt(0).toUpperCase() + status.state.slice(1)}
            </div>
            <div className="text-sm text-gray-400">
              {getStatusMessage()}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm text-mud-cyan">
            Messages: {status.messageCount}
          </div>
          <div className="text-xs text-gray-400">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}