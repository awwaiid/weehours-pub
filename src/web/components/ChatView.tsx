'use client';

import { useState, useEffect, useRef } from 'react';

interface ParsedEvent {
  id: number;
  event_type: string;
  data: any;
  timestamp: string;
}

interface ChatViewProps {
  sessionId: string;
}

export default function ChatView({ sessionId }: ChatViewProps) {
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevEventCountRef = useRef(0);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    // Only scroll if we have new events (count increased)
    if (events.length > prevEventCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevEventCountRef.current = events.length;
  }, [events]);

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/mud/events?limit=50', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents((data.events || []).reverse());
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const renderEvent = (event: ParsedEvent) => {
    const time = formatTimestamp(event.timestamp);
    
    switch (event.event_type) {
      case 'chat_message':
        return (
          <div key={event.id} className="mb-2">
            <span className="text-mud-cyan text-xs">[{time}] </span>
            <span className="text-mud-yellow">{event.data.speaker}:</span>
            <span className="text-white ml-2">{event.data.message}</span>
          </div>
        );
        
      case 'user_command': {
        // Don't render chat commands since they'll be echoed back by the server
        const command = event.data.command?.toLowerCase() || '';
        const isChatCommand = command.startsWith('say ') || 
                             command.startsWith('tell ') || 
                             command.startsWith('"') ||
                             command.startsWith('\'') ||
                             /^say$/.test(command);
        
        if (isChatCommand) {
          return null; // Don't render chat commands
        }
        
        return (
          <div key={event.id} className="mb-2">
            <span className="text-mud-cyan text-xs">[{time}] </span>
            <span className="text-mud-green">{'> ' + event.data.command}</span>
          </div>
        );
      }
        
      case 'room_description':
        return (
          <div key={event.id} className="mb-3 p-2 bg-mud-dark border-l-2 border-mud-cyan">
            <span className="text-mud-cyan text-xs">[{time}] </span>
            <div className="text-white">
              <div className="font-bold text-mud-yellow">{event.data.title}</div>
              <div className="mt-1">{event.data.description}</div>
              {event.data.exits && (
                <div className="mt-2 text-mud-cyan">
                  Exits: {event.data.exits.join(', ')}
                </div>
              )}
            </div>
          </div>
        );
        
      case 'player_list':
        return (
          <div key={event.id} className="mb-3 p-2 bg-mud-dark border-l-2 border-mud-green">
            <span className="text-mud-cyan text-xs">[{time}] </span>
            <div className="text-mud-green font-bold">Players Online:</div>
            {event.data.players && event.data.players.map((player: any, i: number) => (
              <div key={i} className="text-white ml-2">
                {player.name} {player.idle && `(idle: ${player.idle})`}
              </div>
            ))}
          </div>
        );
        
      case 'system_response':
        return (
          <div key={event.id} className="mb-2">
            <span className="text-mud-cyan text-xs">[{time}] </span>
            <span className="text-red-400">{event.data.message}</span>
          </div>
        );
        
      case 'player_action':
        return (
          <div key={event.id} className="mb-2">
            <span className="text-mud-cyan text-xs">[{time}] </span>
            <span className="text-mud-yellow italic">{event.data.action}</span>
          </div>
        );
        
      case 'help_text':
        return (
          <div key={event.id} className="mb-3 p-2 bg-mud-dark border-l-2 border-mud-yellow">
            <span className="text-mud-cyan text-xs">[{time}] </span>
            <pre className="text-white whitespace-pre-wrap text-sm">{event.data.content}</pre>
          </div>
        );
        
      default:
        const hasContent = event.data && typeof event.data === 'object' && event.data.content;
        const displayType = hasContent ? 'world' : event.event_type;
        
        return (
          <div key={event.id} className="mb-3 p-2 bg-mud-dark border border-mud-bronze rounded">
            <span className="text-mud-cyan text-xs">[{time}] </span>
            <span className="text-gray-400">[{displayType}]</span>
            <pre className="text-gray-300 text-sm mt-1 whitespace-pre-wrap font-mono">
              {hasContent
                ? event.data.content 
                : typeof event.data === 'string' 
                  ? event.data 
                  : JSON.stringify(event.data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div 
      ref={scrollRef}
      className="h-full overflow-y-auto bg-black text-mud-green border border-mud-bronze rounded"
      style={{ 
        fontFamily: '"Courier New", monospace',
        fontSize: '0.875rem',
        whiteSpace: 'normal'
      }}
    >
        {events.length === 0 ? (
          <div className="text-gray-400 italic">No parsed events yet. Try connecting and sending some commands!</div>
        ) : (
          events.map(renderEvent)
        )}
    </div>
  );
}