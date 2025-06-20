
import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon, MicrophoneIcon, StopCircleIcon } from './IconComponents';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  speechRecognitionSupported: boolean;
  onSpeechError: (message: string) => void;
}

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition: SpeechRecognition | null = null;

if (SpeechRecognitionAPI) {
  recognition = new SpeechRecognitionAPI();
  recognition.continuous = false; // Important: stops after a single utterance
  recognition.interimResults = true;
  recognition.lang = 'en-US';
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, speechRecognitionSupported, onSpeechError }) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const latestFinalTranscriptRef = useRef<string>('');

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentTranscript = "";
      // Concatenate all results so far. The last one will be the most complete.
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      setInputValue(currentTranscript); // Show interim and final results in textarea

      // If the LATEST result segment is final, this is our candidate for submission
      if (event.results[event.results.length - 1].isFinal) {
        latestFinalTranscriptRef.current = currentTranscript.trim();
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      const textToSend = latestFinalTranscriptRef.current;
      if (textToSend) {
        onSendMessage(textToSend);
        setInputValue(''); // Clear input field after sending
        latestFinalTranscriptRef.current = ''; // Clear the ref for the next use
      }
      // If recognition stops due to 'no-speech' error, 'onerror' handles displaying the message,
      // and latestFinalTranscriptRef.current should be empty (or from a prior successful send), so no message is sent.
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error, event.message);
      let errorMessage = `Speech recognition error: ${event.error}.`;
      if (event.message) {
        errorMessage = event.message;
      }
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = "Didn't catch that, could you try again? 🤔";
          break;
        case 'audio-capture':
          errorMessage = "Hmm, couldn't access your microphone. Check permissions? 🎤";
          break;
        case 'not-allowed':
          errorMessage = "Looks like microphone access was denied. You can change this in browser settings if you want to use voice input! 👍";
          break;
        default:
          errorMessage = `Oops, voice input ran into a snag: ${event.error}. ${event.message || ''}`;
      }
      onSpeechError(errorMessage);
      setIsRecording(false); // Ensure recording state is reset on error
      latestFinalTranscriptRef.current = ''; // Clear any partial transcript on error
    };
    
    return () => {
      if (recognition) {
        recognition.abort();
        recognition.onresult = null;
        recognition.onend = null;
        recognition.onerror = null;
      }
    };
  }, [onSpeechError, onSendMessage]);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
      latestFinalTranscriptRef.current = ''; // Ensure ref is cleared if text is sent manually
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const toggleRecording = () => {
    if (!recognition || !SpeechRecognitionAPI || !speechRecognitionSupported) {
      onSpeechError("Sorry, voice input isn't available on your browser. 😕");
      return;
    }
    if (isRecording) {
      recognition.stop(); // This will trigger onend, which handles sending the message
    } else {
      setInputValue(''); // Clear previous text input before starting new recording
      latestFinalTranscriptRef.current = ''; // Clear any stale transcript
      try {
        recognition.start();
        setIsRecording(true);
      } catch (error: any) {
         console.error("Error starting speech recognition:", error);
         let startErrorMessage = "Couldn't start voice recording. Maybe try again?";
         if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
            startErrorMessage = "Microphone access denied. Please enable it in your browser settings. 🎤";
         } else if (error.name === 'InvalidStateError') {
            // This can happen if start() is called too quickly after a stop()
            // or if it's already started.
            // Let onend handle the existing session if it was an accidental double-click to start.
             if (recognition && typeof recognition.stop === 'function') {
                try {
                    recognition.stop(); // Try to stop any existing session gracefully
                } catch(stopError) {
                    console.warn("Problem trying to stop existing recognition:", stopError);
                }
            }
            // Attempt to start fresh after a brief delay
            setTimeout(() => {
                try {
                    setInputValue('');
                    latestFinalTranscriptRef.current = '';
                    recognition?.start();
                    setIsRecording(true);
                } catch (retryError: any) {
                     console.error("Error retrying speech recognition start:", retryError);
                     onSpeechError("Still couldn't start voice recording. Try refreshing? 🤔");
                     setIsRecording(false);
                }
            }, 100); // 100ms delay might be enough for the state to settle
            return; // Avoid setting error message immediately
         }
         onSpeechError(startErrorMessage);
         setIsRecording(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-800">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isRecording ? "Listening..." : "Ask Tejaswi anything... (Shift+Enter for new line)"}
          className="flex-grow p-3 bg-gray-700 text-gray-100 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none placeholder-gray-400 outline-none"
          rows={1}
          disabled={isLoading && !isRecording} // Allow input if recording, even if main chat is loading previous AI response
          style={{ minHeight: '48px', maxHeight: '150px' }}
          aria-label="Message input for Tejaswi"
        />
        <button
          type="button"
          onClick={toggleRecording}
          disabled={isLoading || !speechRecognitionSupported} // Keep main loading check for button enablement
          className={`p-3 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
            isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-green-600 hover:bg-green-700'
          }`}
          aria-label={isRecording ? "Stop recording" : "Start voice input"}
          title={isRecording ? "Stop recording" : "Start voice input"}
        >
          {isRecording ? <StopCircleIcon className="w-6 h-6" /> : <MicrophoneIcon className="w-6 h-6" />}
        </button>
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim() || isRecording} // Disable send if recording
          className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          <PaperAirplaneIcon className="w-6 h-6" />
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
