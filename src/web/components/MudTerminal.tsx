'use client';

import { useEffect, useRef } from 'react';

interface MudMessage {
  content: string;
  isOutgoing: boolean;
}

interface MudTerminalProps {
  messages: MudMessage[]
}

export default function MudTerminal({ messages }: MudTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  const formatMessage = (message: MudMessage) => {
    
    if (message.isOutgoing) {
      return {
        content: `> ${message.content}`,
        className: 'text-mud-cyan'
      };
    }
    
    // Basic ANSI color handling - could be expanded
    let content = message.content;
    let className = 'text-mud-green';
    
    // Simple color detection for common MUD patterns
    if (content.includes('says') || content.includes('tells you')) {
      className = 'text-mud-yellow';
    } else if (content.includes('You are in') || content.includes('obvious exits')) {
      className = 'text-white';
    } else if (content.includes('HP:') || content.includes('SP:')) {
      className = 'text-mud-cyan';
    }
    
    return { content, className };
  };

  return (
    <div className="mud-card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-mud-green">
          MUD Terminal
        </h3>
        <span className="text-sm text-mud-cyan">
          {messages.length} messages
        </span>
      </div>
      
      <div
        ref={terminalRef}
        className="mud-terminal"
      >
        {messages.length === 0 ? (
          <div className="text-gray-400 italic">
            No messages yet. Connect to the MUD to start chatting!
          </div>
        ) : (
          messages.map((message, index) => {
            const formatted = formatMessage(message);
            return (
              <pre
                key={index}
                className={`${formatted.className} leading-relaxed`}
              >
                {formatted.content}
              </pre>
            );
          })
        )}
      </div>
    </div>
  );
}