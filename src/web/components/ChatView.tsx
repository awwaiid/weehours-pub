'use client';

import { useState, useEffect, useRef } from 'react';
import { apiCall } from '../lib/api';

interface Player {
  name: string;
  idle?: string;
}

interface EventData {
  speaker?: string;
  message?: string;
  command?: string;
  title?: string;
  description?: string;
  exits?: string[];
  players?: Player[];
  action?: string;
  content?: string;
  [key: string]: unknown;
}

interface ParsedEvent {
  id: number;
  event_type: string;
  data: EventData;
  timestamp: string;
}

interface ChatViewProps {
  sessionId: string;
}

export default function ChatView({ sessionId }: ChatViewProps) {
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial load of events
    loadEvents();
    
    // Set up WebSocket connection
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        console.log('Sending auth with sessionId:', sessionId);
        // Authenticate with session ID
        ws.send(JSON.stringify({ type: 'authenticate', sessionId }));
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket received:', data);
          
          if (data.type === 'authenticated') {
            console.log('WebSocket authenticated successfully');
          } else if (data.type === 'new_message') {
            // Reload events when new message arrives
            loadEvents();
          } else if (data.type === 'status_change') {
            // Could update connection status here if needed
            console.log('Status change:', data.status);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        // Only reconnect if it wasn't a clean close and we don't already have a timeout
        if (event.code !== 1000 && !reconnectTimeoutRef.current) {
          console.log('Attempting to reconnect in 3 seconds...');
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 3000);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };
    
    connectWebSocket();
    
    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting'); // Clean close
      }
    };
  }, [sessionId]);

  useEffect(() => {
    // Always scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const loadEvents = async () => {
    try {
      const response = await apiCall('/api/mud/events?limit=50');
      
      if (response.ok) {
        const data = await response.json();
        setEvents((data.events || []).reverse());
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    // If timestamp doesn't have timezone info, treat it as UTC and convert to local
    const date = timestamp.includes('Z') || timestamp.includes('+') || timestamp.includes('T') 
      ? new Date(timestamp)
      : new Date(timestamp + 'Z'); // Add Z to force UTC interpretation, then convert to local
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            {event.data.players && event.data.players.map((player: Player, i: number) => (
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
        
      default: {
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
    }
  };

  return (
    <div 
      ref={scrollRef}
      className="h-full min-h-0 overflow-y-auto bg-black text-mud-green border border-mud-bronze rounded"
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