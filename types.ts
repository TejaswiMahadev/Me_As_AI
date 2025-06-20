
export enum SenderType {
  USER = 'user',
  AI = 'ai',
  SYSTEM = 'system', // For potential system messages in UI, not used by Gemini directly here
}

export interface Message {
  id: string;
  text: string;
  sender: SenderType;
  timestamp: Date;
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  // Could have other types like "retrievedContext" in the future
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  // Other grounding metadata fields
}

export interface Candidate {
  content: {
    parts: { text: string }[]; // Simplified, actual structure can be more complex
    role: string;
  };
  finishReason?: string;
  safetyRatings?: any[]; // Define more specifically if needed
  groundingMetadata?: GroundingMetadata;
}
