export interface ParsedEvent {
  id?: number;
  session_id: number;
  event_type: string;
  data: any;
  raw_message_ids: number[];
  timestamp?: string;
}

export interface MessageParserContext {
  pendingMessages: Array<{id: number, content: string, timestamp: string}>;
  lastEventType?: string;
  roomContext?: any;
}

export class MessageParser {
  
  // Event types we can identify
  static readonly EVENT_TYPES = {
    LOGIN_SUCCESS: 'login_success',
    ROOM_DESCRIPTION: 'room_description', 
    PLAYER_ACTION: 'player_action',
    SYSTEM_RESPONSE: 'system_response',
    CHAT_MESSAGE: 'chat_message',
    PLAYER_LIST: 'player_list',
    HELP_TEXT: 'help_text',
    COMMAND_PROMPT: 'command_prompt',
    TELNET_NEGOTIATION: 'telnet_negotiation',
    WELCOME_SCREEN: 'welcome_screen',
    URL_SUBMISSION: 'url_submission'
  } as const;

  private context: MessageParserContext = {
    pendingMessages: []
  };

  /**
   * Parse a single raw message and potentially return multiple events
   */
  parseMessage(id: number, content: string, timestamp: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    
    // Add to pending messages for context
    this.context.pendingMessages.push({id, content, timestamp});
    
    // Clean the content (remove telnet sequences, normalize whitespace)
    const cleanContent = this.cleanContent(content);
    
    if (!cleanContent.trim()) {
      // Skip empty messages
      return events;
    }

    // Pattern matching for different event types
    if (this.isLoginSuccess(cleanContent)) {
      events.push(this.createLoginSuccessEvent(id, cleanContent, timestamp));
    } 
    else if (this.isRoomDescription(cleanContent)) {
      events.push(this.createRoomDescriptionEvent(id, cleanContent, timestamp));
    }
    else if (this.isChatMessage(cleanContent)) {
      events.push(this.createChatMessageEvent(id, cleanContent, timestamp));
    }
    else if (this.isPlayerList(cleanContent)) {
      events.push(this.createPlayerListEvent(id, cleanContent, timestamp));
    }
    else if (this.isPlayerAction(cleanContent)) {
      events.push(this.createPlayerActionEvent(id, cleanContent, timestamp));
    }
    else if (this.isHelpText(cleanContent)) {
      events.push(this.createHelpTextEvent(id, cleanContent, timestamp));
    }
    else if (this.isSystemResponse(cleanContent)) {
      events.push(this.createSystemResponseEvent(id, cleanContent, timestamp));
    }
    else if (this.isCommandPrompt(cleanContent)) {
      events.push(this.createCommandPromptEvent(id, cleanContent, timestamp));
    }
    else if (this.isWelcomeScreen(cleanContent)) {
      events.push(this.createWelcomeScreenEvent(id, cleanContent, timestamp));
    }
    else if (this.isUrlSubmission(cleanContent)) {
      events.push(this.createUrlSubmissionEvent(id, cleanContent, timestamp));
    }
    else {
      // Unknown message type
      events.push(this.createUnknownEvent(id, cleanContent, timestamp));
    }

    // Update context based on events
    this.updateContext(events);
    
    return events;
  }

  private cleanContent(content: string): string {
    // Remove telnet negotiation sequences (basic)
    let cleaned = content.replace(/\xFF[\xFB-\xFF]./g, '');
    
    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    return cleaned;
  }

  // Pattern detection methods
  private isLoginSuccess(content: string): boolean {
    return content.includes('[Awwaiid has entered the game.]') || 
           content.includes('entered the game');
  }

  private isRoomDescription(content: string): boolean {
    // Room descriptions typically start with "You are" and contain exits
    return content.includes('You are in') && 
           (content.includes('obvious exits:') || content.includes('There are'));
  }

  private isChatMessage(content: string): boolean {
    // Chat patterns: "You say in common:" or other players speaking
    return /You say in \w+:/.test(content) ||
           /\w+ says in \w+:/.test(content) ||
           /\w+ tells you:/.test(content) ||
           /You tell \w+:/.test(content);
  }

  private isPlayerList(content: string): boolean {
    return content.includes('WeeHours LP ::') && content.includes('players ::');
  }

  private isPlayerAction(content: string): boolean {
    // Simple actions like "You hop up and down."
    return /^You \w+/.test(content.trim()) && !content.includes('You say') && !content.includes('You are');
  }

  private isHelpText(content: string): boolean {
    return content.includes('Commands      :') || 
           content.includes('--------------------------------------------------------------------------');
  }

  private isSystemResponse(content: string): boolean {
    return content.startsWith('Syntax:') || 
           content.trim() === 'What?' ||
           content.includes('Sorry, no such help topic') ||
           content.includes('Changed \'idle\' to');
  }

  private isCommandPrompt(content: string): boolean {
    return content.trim() === '>' || content.trim() === '> ';
  }

  private isWelcomeScreen(content: string): boolean {
    return content.includes('WEEHOURS LPMUD') || 
           content.includes('What is your name:') ||
           content.includes('EEEEEEEEEEE');
  }

  private isUrlSubmission(content: string): boolean {
    return content.includes('URL added to http://weehours.net');
  }

  // Event creation methods
  private createLoginSuccessEvent(id: number, content: string, timestamp: string): ParsedEvent {
    return {
      session_id: 1,
      event_type: MessageParser.EVENT_TYPES.LOGIN_SUCCESS,
      data: {
        message: content.trim(),
        player_name: 'Awwaiid'
      },
      raw_message_ids: [id],
      timestamp
    };
  }

  private createRoomDescriptionEvent(id: number, content: string, timestamp: string): ParsedEvent {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    
    // Parse room components
    const description = [];
    const exits = [];
    const objects = [];
    const npcs = [];
    
    let currentSection = 'description';
    
    for (const line of lines) {
      if (line.includes('obvious exits:')) {
        currentSection = 'exits';
        const exitMatch = line.match(/exits:\s*(.+)$/);
        if (exitMatch) {
          exits.push(...exitMatch[1].split(',').map(e => e.trim()));
        }
      } else if (line.includes('There is a') || line.includes('There are')) {
        currentSection = 'objects';
      } else if (currentSection === 'description' && !line.includes('You are in')) {
        description.push(line);
      } else if (currentSection === 'objects') {
        if (line.includes('.')) {
          objects.push(line);
        } else {
          npcs.push(line);
        }
      }
    }

    return {
      session_id: 1,
      event_type: MessageParser.EVENT_TYPES.ROOM_DESCRIPTION,
      data: {
        description: description.join(' '),
        exits,
        objects,
        npcs,
        raw_content: content
      },
      raw_message_ids: [id],
      timestamp
    };
  }

  private createChatMessageEvent(id: number, content: string, timestamp: string): ParsedEvent {
    const youSayMatch = content.match(/You say in (\w+): (.+)/);
    const otherSayMatch = content.match(/(\w+) says in (\w+): (.+)/);
    const tellMatch = content.match(/(\w+) tells you: (.+)/);
    
    let speaker, language, message, chat_type;
    
    if (youSayMatch) {
      speaker = 'Awwaiid';
      language = youSayMatch[1];
      message = youSayMatch[2];
      chat_type = 'say';
    } else if (otherSayMatch) {
      speaker = otherSayMatch[1];
      language = otherSayMatch[2]; 
      message = otherSayMatch[3];
      chat_type = 'say';
    } else if (tellMatch) {
      speaker = tellMatch[1];
      message = tellMatch[2];
      chat_type = 'tell';
      language = 'common';
    }

    return {
      session_id: 1,
      event_type: MessageParser.EVENT_TYPES.CHAT_MESSAGE,
      data: {
        speaker,
        message,
        language,
        chat_type,
        raw_content: content.trim()
      },
      raw_message_ids: [id],
      timestamp
    };
  }

  private createPlayerListEvent(id: number, content: string, timestamp: string): ParsedEvent {
    const lines = content.split('\n');
    const players = [];
    
    for (const line of lines) {
      const playerMatch = line.match(/^\(idle ([^)]+)\) (.+?)(\s+\([^)]+\))?\s*(.*)$/);
      if (playerMatch) {
        players.push({
          name: playerMatch[2].trim(),
          idle_time: playerMatch[1],
          title: playerMatch[3] || '',
          status: playerMatch[4] || ''
        });
      } else if (line.match(/^\w+/) && !line.includes('::') && !line.includes('---')) {
        // Active player (no idle time)
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          players.push({
            name: parts[0],
            idle_time: 'active',
            title: parts.slice(1).join(' '),
            status: ''
          });
        }
      }
    }

    return {
      session_id: 1,
      event_type: MessageParser.EVENT_TYPES.PLAYER_LIST,
      data: {
        players,
        total_players: players.length,
        raw_content: content
      },
      raw_message_ids: [id],
      timestamp
    };
  }

  private createPlayerActionEvent(id: number, content: string, timestamp: string): ParsedEvent {
    return {
      session_id: 1,
      event_type: MessageParser.EVENT_TYPES.PLAYER_ACTION,
      data: {
        action: content.trim(),
        player: 'Awwaiid'
      },
      raw_message_ids: [id],
      timestamp
    };
  }

  private createHelpTextEvent(id: number, content: string, timestamp: string): ParsedEvent {
    return {
      session_id: 1,
      event_type: MessageParser.EVENT_TYPES.HELP_TEXT,
      data: {
        content: content.trim(),
        formatted: true
      },
      raw_message_ids: [id],
      timestamp
    };
  }

  private createSystemResponseEvent(id: number, content: string, timestamp: string): ParsedEvent {
    return {
      session_id: 1,
      event_type: MessageParser.EVENT_TYPES.SYSTEM_RESPONSE,
      data: {
        message: content.trim(),
        response_type: this.classifySystemResponse(content)
      },
      raw_message_ids: [id],
      timestamp
    };
  }

  private createCommandPromptEvent(id: number, content: string, timestamp: string): ParsedEvent {
    return {
      session_id: 1,
      event_type: MessageParser.EVENT_TYPES.COMMAND_PROMPT,
      data: {
        ready_for_input: true
      },
      raw_message_ids: [id],
      timestamp
    };
  }

  private createWelcomeScreenEvent(id: number, content: string, timestamp: string): ParsedEvent {
    return {
      session_id: 1,
      event_type: MessageParser.EVENT_TYPES.WELCOME_SCREEN,
      data: {
        content: content,
        ascii_art: true
      },
      raw_message_ids: [id],
      timestamp
    };
  }

  private createUrlSubmissionEvent(id: number, content: string, timestamp: string): ParsedEvent {
    return {
      session_id: 1,
      event_type: MessageParser.EVENT_TYPES.URL_SUBMISSION,
      data: {
        message: content.trim(),
        success: content.includes('URL added')
      },
      raw_message_ids: [id],
      timestamp
    };
  }

  private createUnknownEvent(id: number, content: string, timestamp: string): ParsedEvent {
    return {
      session_id: 1,
      event_type: 'unknown',
      data: {
        content: content.trim()
      },
      raw_message_ids: [id],
      timestamp
    };
  }

  private classifySystemResponse(content: string): string {
    if (content.startsWith('Syntax:')) return 'syntax_error';
    if (content.trim() === 'What?') return 'unknown_command';
    if (content.includes('Sorry, no such help topic')) return 'help_not_found';
    if (content.includes('Changed \'idle\' to')) return 'setting_changed';
    return 'general';
  }

  private updateContext(events: ParsedEvent[]): void {
    for (const event of events) {
      this.context.lastEventType = event.event_type;
      
      if (event.event_type === MessageParser.EVENT_TYPES.ROOM_DESCRIPTION) {
        this.context.roomContext = event.data;
      }
    }
  }
}