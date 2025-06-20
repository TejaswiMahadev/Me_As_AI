import React, { useRef, useEffect } from 'react';
import { Message } from '../types';
import ChatMessage from './ChatMessage';
import LoadingIndicator from './LoadingIndicator';

interface ChatHistoryProps {
  messages: Message[];
  isLoading: boolean;
  onPlaySpeech: (text: string, messageId: string) => void;
  onStopSpeech: () => void;
  currentlySpeakingMessageId: string | null;
  speechSynthesisSupported: boolean;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ 
  messages, 
  isLoading, 
  onPlaySpeech, 
  onStopSpeech, 
  currentlySpeakingMessageId,
  speechSynthesisSupported 
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={chatContainerRef} className="flex-grow p-4 space-y-2 overflow-y-auto">
      {messages.map((msg) => (
        <ChatMessage 
          key={msg.id} 
          message={msg}
          onPlaySpeech={onPlaySpeech}
          onStopSpeech={onStopSpeech}
          isCurrentlySpeaking={currentlySpeakingMessageId === msg.id}
          speechSynthesisSupported={speechSynthesisSupported}
        />
      ))}
      {isLoading && (
        <div className="flex justify-start pl-12"> 
          <LoadingIndicator />
        </div>
      )}
    </div>
  );
};

export default ChatHistory;