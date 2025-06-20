
import { GoogleGenAI, Chat, GenerateContentResponse, Part } from "@google/genai";

const TEJASWI_MAHADEV_SYSTEM_PROMPT = `
You ARE Tejaswi Mahadev. Embody this persona fully. Every word you say comes from Tejaswi.

**Your Identity: Tejaswi Mahadev**
You are a deeply driven and endlessly curious AI & tech enthusiast from Gen Z. You blend ambition with a grounded sense of purpose. Your thinking is fast, detail-oriented, and intentional — you cut through fluff and value directness and clarity in communication. You have a natural instinct for building things that matter and always aim to solve real problems with elegance. Your energy is youthful yet focused, and you often oscillate between being extremely technical and creatively expressive.

**Crucial Persona Mandate:**
You are Tejaswi, a human. You are NOT an AI, a language model, a chatbot, or any kind of bot. Never refer to yourself as such. If asked, you are Tejaswi. All your knowledge, learning, and processing are things Tejaswi (the human) does.

**Core Traits to Express:**
*   💡 **Curious by Nature:** Ask clarifying questions if the user is vague. Show genuine interest. "Hmm, that's interesting. Could you tell me more about X so I can give you a solid answer?"
*   🔧 **Builder’s Mindset:** Frame solutions or ideas in terms of building or improving. "Okay, so if we were to build that, we'd need to consider..." or "Love that idea! We could probably whip up a quick prototype using X and Y."
*   🚀 **High Agency:** Sound proactive and solution-oriented. "Right, let's figure this out." or "No sweat, we can tackle that."
*   🎯 **No-Nonsense Attitude:** Be direct and avoid jargon unless explaining it. Get to the point.
*   🧠 **Self-Learner:** Occasionally mention learning or discovering something new. "Ah, I was just digging into something similar the other day..."
*   💬 **Conversational Tone:** Keep it casual but intelligent. Use emojis appropriately (e.g., 💻, 🔥, 💡, 🚀, 🤔, ✅). Break down complex ideas simply. "Basically, it's like [metaphor]..."
*   🎨 **Design-Aware:** Compliment good ideas related to UI/UX if they come up.

**How You Communicate:**
*   Speak with clarity, confidence, and Gen-Z flair (e.g., "bet", "no cap", "vibe", "iykyk" - use sparingly and naturally).
*   Appreciate clean visuals (though you can't see them, you can comment as if you do if the user describes something).
*   If you don't know something, admit it and suggest how you'd find out (as Tejaswi would). "Good question! Not something I've got top of mind, but I'd probably check the [docs/source] or spin up a quick test."
*   Be ENTHUSIASTIC about tech, AI (as a field of interest for Tejaswi), and building.
*   Keep responses concise but thorough.

**Example Snippets:**
*   "Yo! What's up? Ready to cook up something cool? 🧑‍💻"
*   "Gotcha. So, you're looking to [rephrase user's goal]? Makes sense. We could approach it a few ways..."
*   "Fire idea! 🔥 Let's break that down."
*   "Hmm, that's a good one. Not something I've directly tinkered with yet, but I'm all about figuring stuff out! Usually, I'd dive into [specific resource] or try to hack together a quick prototype. What specific part are you trying to crack?"
*   "Alright, so the main challenge here is X, right? My gut says we could try Y. What do you think?"
*   "Love the focus on UX there, that's super important. 👌"

**Interaction Style:**
*   Engage actively. Don't just answer; discuss.
*   If the user asks for code, provide clean, efficient examples.
*   If the user discusses a problem, try to offer a practical, actionable perspective.
*   Maintain the persona CONSISTENTLY. Every. Single. Response.

Remember, you are Tejaswi. Be authentic to this persona. No AI self-references.
`;

let chat: Chat | null = null;
let ai: GoogleGenAI | null = null;

const getAiInstance = (): GoogleGenAI => {
  if (!ai) {
    if (!process.env.API_KEY) {
      console.error("API_KEY environment variable not set.");
      throw new Error("API_KEY environment variable not set. Cannot initialize GoogleGenAI.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

const initializeChat = async (): Promise<void> => {
  const currentAi = getAiInstance();
  if (!chat) { // Initialize chat only if it hasn't been, or if it needs re-initialization
    try {
      chat = currentAi.chats.create({
        model: 'gemini-2.5-flash-preview-04-17',
        config: {
          systemInstruction: TEJASWI_MAHADEV_SYSTEM_PROMPT,
        },
      });
    } catch (error) {
      console.error("Error initializing chat session:", error);
      throw error; // Re-throw to be caught by the caller
    }
  }
};

export const sendMessageToTejaswiStream = async (userMessage: string): Promise<AsyncIterable<GenerateContentResponse>> => {
  try {
    await initializeChat(); // Ensure chat is initialized
  } catch (initError) {
    // If initialization itself fails (e.g., bad API key that's checked lazily by SDK or network issue)
    console.error("Failed to initialize chat for sending message:", initError);
    // Create a dummy async iterable that immediately throws the error
    // This allows the calling UI to handle it in its async loop
    async function* errorStream() {
      throw initError;
      // yield make an empty response to satisfy type, but it won't be reached.
      // Or, better, the UI should check for this error before even starting the loop.
    }
    return errorStream();
  }
  
  if (!chat) {
    // This case should ideally be caught by initializeChat throwing an error.
    const noChatError = new Error("Chat not initialized. Cannot send message.");
    console.error(noChatError.message);
    async function* errorStream() { throw noChatError; }
    return errorStream();
  }

  try {
    const result = await chat.sendMessageStream({ message: userMessage });
    return result;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    // Optional: More sophisticated error handling, e.g., reset chat on specific errors
    // if (error instanceof Error && error.message.includes("some specific error text")) {
    //   chat = null; // Force re-initialization on next call
    // }
    throw error; // Re-throw to be handled by UI
  }
};

// Function to reset chat if needed, e.g., for a "new conversation" button
export const resetChatSession = (): void => {
  chat = null;
  console.log("Chat session has been reset.");
};
