'use client';

import { useState, useRef, useEffect } from 'react';

interface CommandInputProps {
  onSendCommand: (command: string) => void
  disabled?: boolean
}

export default function CommandInput({ onSendCommand, disabled = false }: CommandInputProps) {
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [mode, setMode] = useState<'chat' | 'cmd'>('chat');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when component mounts or becomes enabled
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  useEffect(() => {
    // Keep input focused at all times when not disabled
    const focusInput = () => {
      if (!disabled && inputRef.current) {
        inputRef.current.focus();
      }
    };

    // Focus on mount
    focusInput();

    // Re-focus if focus is lost
    const handleFocusLoss = () => {
      setTimeout(focusInput, 0);
    };

    if (inputRef.current) {
      inputRef.current.addEventListener('blur', handleFocusLoss);
    }

    return () => {
      if (inputRef.current) {
        inputRef.current.removeEventListener('blur', handleFocusLoss);
      }
    };
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!command.trim() || disabled) return;
    
    // Prepare the actual command to send
    let actualCommand = command;
    if (mode === 'chat') {
      // Check for /me command in chat mode
      if (command.startsWith('/me ')) {
        // Remove "/me " and send as a direct command
        actualCommand = command.substring(4);
      } else {
        // Wrap chat messages in 'say' command
        actualCommand = `say ${command}`;
      }
    }
    
    // Add to history
    setCommandHistory(prev => [...prev, command]);
    setHistoryIndex(-1);
    
    // Send command
    onSendCommand(actualCommand);
    
    // Clear input
    setCommand('');
    
    // Refocus input after sending message
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 
          ? commandHistory.length - 1 
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Basic command completion - could be expanded
      const commonCommands = [
        'look', 'who', 'inventory', 'get', 'drop', 'say', 'tell', 
        'north', 'south', 'east', 'west', 'up', 'down'
      ];
      
      const partial = command.toLowerCase();
      const matches = commonCommands.filter(cmd => cmd.startsWith(partial));
      
      if (matches.length === 1) {
        setCommand(matches[0] + ' ');
      } else if (matches.length > 1) {
        // Show available completions in console for now
        console.log('Available completions:', matches);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <button
        type="button"
        onClick={() => setMode(mode === 'chat' ? 'cmd' : 'chat')}
        disabled={disabled}
        className={`mud-button px-3 ${
          mode === 'chat' 
            ? 'bg-mud-bronze text-mud-dark border-mud-yellow' 
            : 'bg-mud-light text-mud-green border-mud-bronze'
        }`}
      >
        {mode === 'chat' ? 'Chat' : 'Cmd'}
      </button>
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="mud-input"
          placeholder={disabled 
            ? 'Connect to MUD to send commands' 
            : mode === 'chat' 
              ? 'Type your message...' 
              : 'Enter MUD command...'
          }
          autoComplete="off"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !command.trim()}
        className="mud-button px-4"
      >
        ▶
      </button>
    </form>
  );
}