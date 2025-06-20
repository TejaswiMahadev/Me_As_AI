import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Message, SenderType } from './types';
import ChatHistory from './components/ChatHistory';
import ChatInput from './components/ChatInput';
import { sendMessageToTejaswiStream, resetChatSession } from './services/geminiService';
import { GenerateContentResponse } from "@google/genai";
import { AcademicCapIcon, ExclamationTriangleIcon } from './components/IconComponents';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  // Speech Synthesis State
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [currentlySpeakingMessageId, setCurrentlySpeakingMessageId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof process.env.API_KEY === 'undefined' || process.env.API_KEY === "") {
      setApiKeyMissing(true);
      setError("API_KEY environment variable is not set. This application requires an API key to function.");
      return;
    }

    setSpeechSynthesisSupported('speechSynthesis' in window);
    setSpeechRecognitionSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    const initialGreeting: Message = {
      id: 'init-greet-' + Date.now(),
      text: "Yo! What's up? Ready to cook up something cool, or just wanna chat about the latest in tech? 🧑‍💻 Let me know what's on your mind!",
      sender: SenderType.AI,
      timestamp: new Date(),
    };
    setMessages([initialGreeting]);
    
    // Cleanup speech synthesis on unmount
    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (apiKeyMissing) {
      setError("Cannot send message: API_KEY is missing.");
      return;
    }
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel(); // Stop any ongoing speech before sending/receiving new message
      setCurrentlySpeakingMessageId(null);
    }

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      text,
      sender: SenderType.USER,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);
    setError(null);

    const aiMessageId = Date.now().toString() + '-ai';
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: aiMessageId, text: '', sender: SenderType.AI, timestamp: new Date() },
    ]);
    
    let currentAiResponseText = "";

    try {
      const stream: AsyncIterable<GenerateContentResponse> = await sendMessageToTejaswiStream(text);
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
          currentAiResponseText += chunkText;
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === aiMessageId ? { ...msg, text: currentAiResponseText } : msg
            )
          );
        }
      }
    } catch (e: any) {
      console.error("Error during message streaming:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred with the AI service.";
      setError(`Tejaswi seems to be having a moment... 🤯 (${errorMessage})`);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === aiMessageId ? { ...msg, text: `Sorry, I hit a snag! Error: ${errorMessage}` } : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [apiKeyMissing]);
  
  const handleResetConversation = () => {
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingMessageId(null);
    }
    resetChatSession();
    setMessages([]);
    setError(null);
    setIsLoading(false);
    const initialGreeting: Message = {
      id: 'reset-greet-' + Date.now(),
      text: "Alright, fresh start! What's on your mind now? Let's build something awesome or explore some new tech! 🚀",
      sender: SenderType.AI,
      timestamp: new Date(),
    };
    setMessages([initialGreeting]);
    console.log("Conversation reset!");
  };

  const handlePlaySpeech = useCallback((text: string, messageId: string) => {
    if (!speechSynthesisSupported || !text) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel(); // Stop current speech if any
      // If the same message was speaking, this effectively stops it.
      // If a different message, it stops that and will start the new one.
      if (currentlySpeakingMessageId === messageId) {
         setCurrentlySpeakingMessageId(null);
         return; // User clicked to stop the current message
      }
    }
    
    utteranceRef.current = new SpeechSynthesisUtterance(text);
    // Attempt to find a suitable voice (can be expanded)
    const voices = window.speechSynthesis.getVoices();
    // Prioritize English voices, potentially female if available for "Tejaswi"
    let tejaswiVoice = voices.find(voice => voice.lang.includes('en') && voice.name.includes('Google') && voice.name.includes('Female'));
    if (!tejaswiVoice) tejaswiVoice = voices.find(voice => voice.lang.includes('en') && voice.name.includes('Female'));
    if (!tejaswiVoice) tejaswiVoice = voices.find(voice => voice.lang.includes('en') && (voice.default || voice.name.toLowerCase().includes('female'))); // fallback to default English
    
    if (tejaswiVoice) {
      utteranceRef.current.voice = tejaswiVoice;
    }
    utteranceRef.current.pitch = 1.1; // Slightly higher pitch
    utteranceRef.current.rate = 1.1; // Slightly faster rate

    utteranceRef.current.onstart = () => {
      setCurrentlySpeakingMessageId(messageId);
    };
    utteranceRef.current.onend = () => {
      setCurrentlySpeakingMessageId(null);
    };
    utteranceRef.current.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setError("Oops, couldn't play that message. 😬");
      setCurrentlySpeakingMessageId(null);
    };
    window.speechSynthesis.speak(utteranceRef.current);
  }, [speechSynthesisSupported, currentlySpeakingMessageId]);

  const handleStopSpeech = useCallback(() => {
    if (speechSynthesisSupported && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingMessageId(null);
    }
  }, [speechSynthesisSupported]);
  
  const handleSpeechError = useCallback((message: string) => {
    setError(message); // Display speech-related errors (like permission denied for mic)
  }, []);

  // Effect to load voices for speech synthesis (some browsers need this)
  useEffect(() => {
    if (speechSynthesisSupported) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      loadVoices(); // Initial call
    }
  }, [speechSynthesisSupported]);


  if (apiKeyMissing && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-red-400 p-8">
        <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Configuration Error</h1>
        <p className="text-center max-w-md">The <code>API_KEY</code> environment variable is missing. This application cannot function without it. Please ensure the API key is correctly set up in your environment.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-900 text-gray-100">
      <header className="p-4 bg-gray-800 border-b border-gray-700 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1 rounded-full bg-indigo-500">
              <AcademicCapIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-indigo-400">Tejaswi Mahadev</h1>
              <p className="text-xs text-gray-400">Gen Z AI & Tech Enthusiast</p>
            </div>
          </div>
          <button
            onClick={handleResetConversation}
            className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            New Chat
          </button>
        </div>
      </header>
      
      {error && (
         <div className="p-3 bg-red-800 text-red-100 text-sm text-center">
          <ExclamationTriangleIcon className="w-5 h-5 inline mr-2 align-bottom" />
          {error}
        </div>
      )}

      <ChatHistory 
        messages={messages} 
        isLoading={isLoading}
        onPlaySpeech={handlePlaySpeech}
        onStopSpeech={handleStopSpeech}
        currentlySpeakingMessageId={currentlySpeakingMessageId}
        speechSynthesisSupported={speechSynthesisSupported}
      />
      <ChatInput 
        onSendMessage={handleSendMessage} 
        isLoading={isLoading}
        speechRecognitionSupported={speechRecognitionSupported}
        onSpeechError={handleSpeechError}
      />
    </div>
  );
};

export default App;