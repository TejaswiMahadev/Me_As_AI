import React from 'react';
import { Message, SenderType } from '../types';
import { UserCircleIcon, AcademicCapIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from './IconComponents';

interface ChatMessageProps {
  message: Message;
  onPlaySpeech: (text: string, messageId: string) => void;
  onStopSpeech: () => void;
  isCurrentlySpeaking: boolean;
  speechSynthesisSupported: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onPlaySpeech, 
  onStopSpeech, 
  isCurrentlySpeaking,
  speechSynthesisSupported 
}) => {
  const isUser = message.sender === SenderType.USER;
  const isAI = message.sender === SenderType.AI;

  const formatText = (text: string): React.ReactNode => {
    return text.split('\n').map((line, lineIndex) => (
      <React.Fragment key={lineIndex}>
        {line.split(/(\[.*?\]\(.*?\)|https?:\/\/\S+)/g).map((part, index) => {
          let match;
          if ((match = part.match(/^\[(.*?)\]\((.*?)\)$/))) {
            return (
              <a
                key={index}
                href={match[2]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                {match[1]}
              </a>
            );
          } else if (part.match(/^https?:\/\/\S+$/)) {
             return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                {part}
              </a>
            );
          }
          return part;
        })}
        {lineIndex < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const handleSpeakerClick = () => {
    if (isCurrentlySpeaking) {
      onStopSpeech();
    } else {
      onPlaySpeech(message.text, message.id);
    }
  };

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
          <AcademicCapIcon className="w-5 h-5 text-white" />
        </div>
      )}
      <div
        className={`max-w-[70%] p-3 rounded-lg shadow relative group ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-gray-700 text-gray-100 rounded-bl-none'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{formatText(message.text)}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-400'} text-right`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
         {isAI && speechSynthesisSupported && message.text && (
          <button
            onClick={handleSpeakerClick}
            className="absolute -bottom-3 -right-3 p-1 bg-gray-600 hover:bg-gray-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-label={isCurrentlySpeaking ? 'Stop speech' : 'Play speech'}
            title={isCurrentlySpeaking ? 'Stop speech' : 'Play speech'}
          >
            {isCurrentlySpeaking ? (
              <SpeakerXMarkIcon className="w-4 h-4" />
            ) : (
              <SpeakerWaveIcon className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      {isUser && (
         <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
          <UserCircleIcon className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;