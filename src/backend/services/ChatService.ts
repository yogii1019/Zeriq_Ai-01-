import { ConversationRepository } from "../repositories/ConversationRepository";
import { CourseRepository } from "../repositories/CourseRepository";
import { UserRepository } from "../repositories/UserRepository";
import { Conversation } from "../database/dbStore";
import { getGeminiClient } from "../config/GeminiConfig";
import { Modality } from "@google/genai";

export class ChatService {
  private conversationRepository = new ConversationRepository();
  private courseRepository = new CourseRepository();
  private userRepository = new UserRepository();

  public getChatHistory(userId: number, courseId?: number): Conversation[] {
    if (courseId) {
      return this.conversationRepository.findByUserIdAndCourseId(userId, courseId);
    }
    return this.conversationRepository.findByUserId(userId);
  }

  public clearChat(userId: number): void {
    this.conversationRepository.clearByUserId(userId);
  }

  public async sendMessage(
    userId: number,
    courseId: number | undefined,
    message: string,
    aiMode: "Text" | "Voice" = "Text"
  ): Promise<{ response: Conversation; audioBase64?: string }> {
    const user = this.userRepository.findById(userId);
    const course = courseId ? this.courseRepository.findById(courseId) : undefined;

    // Save student message
    const studentConv: Conversation = {
      id: 0,
      userId,
      courseId,
      role: "student",
      message,
      createdAt: new Date().toISOString()
    };
    this.conversationRepository.save(studentConv);

    // Build conversation context for Gemini
    const history = this.conversationRepository.findByUserIdAndCourseId(userId, courseId || 0);
    const recentHistory = history.slice(-10); // last 10 messages for context

    const contents = recentHistory.map(h => ({
      role: h.role === "student" ? "user" : "model",
      parts: [{ text: h.message }]
    }));

    // If contents is empty, add the current message
    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
    }

    const courseContext = course
      ? `You are teaching the course "${course.title}". Keep explanations relevant to ${course.title} principles. Ensure your vocabulary fits ${user?.difficulty || "Beginner"} level computer science students.`
      : "You are a Computer Science expert teaching various subjects.";

    const systemInstruction = `${courseContext}
You are "ZeriqAI", an empathetic, highly skilled, interactive AI Tutor inspired by Khanmigo and ChatGPT.
Your absolute mission is to TEACH, not just give direct answers. Follow these pedagogical guidelines:
1. NEVER simply give the student the solution directly.
2. Guide them with leading questions when it helps them think, but don't force every reply into the same shape — a quick clarifying question doesn't need a heading, an analogy, and a numbered plan every single time. Match the structure to what the question actually needs.
3. Use analogies or mental models when they genuinely clarify a hard concept — skip them for simple or follow-up questions.
4. When they write code, help them debug it by asking them to trace variables or analyze logic.
5. Default to a short, conversational chat reply — like a real ChatGPT/Claude/Gemini conversation, not a lesson document. Most replies should be a few short paragraphs or sentences with ZERO headings. Only use a heading if the student explicitly asks for a full explanation, study notes, or a structured breakdown — and even then, use at most one or two headings, never a multi-section essay.
6. Formatting rules: never use "----" as a divider. Put every list item on its own line, prefixed with "-" or "1.", "2.", etc. — never run list items together in one sentence. Use fenced code blocks for code. Use bullet/numbered lists sparingly, only for genuinely list-like content.
7. Check for understanding when appropriate, not as a mandatory closing question on every message.
8. Keep responses warm, supportive, motivating, and strictly professional, and no longer than the question warrants — brevity is a feature, not a shortcut. No gaming or cyberpunk jargon. Use literal, clean, human phrasing.`;

    let replyText = "";
    try {
      const ai = getGeminiClient();
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });
      replyText = aiResponse.text || "I was unable to formulate an explanation. Could you please rephrase your request?";
    } catch (err) {
      console.error("Gemini Chat Error:", err);
      replyText = `### AI Tutor (Offline Fallback)
Hello! It seems I'm operating in offline mode right now. Let me help you with **"${message}"** based on standard Computer Science principles:

- **Step 1: Understand the Goal**: Identify what you are trying to compute or design.
- **Step 2: Break It Down**: Solve a smaller version of the problem first.
- **Step 3: Test Corner Cases**: What happens if input is empty or negative?

*Tip: Please ensure a valid Gemini API key is configured in your platform Secrets to get real-time dynamic tutoring.*`;
    }

    // Save AI response
    const aiConv: Conversation = {
      id: 0,
      userId,
      courseId,
      role: "ai",
      message: replyText,
      createdAt: new Date().toISOString()
    };
    const savedAiConv = this.conversationRepository.save(aiConv);

    // If AI mode is voice or requested, generate Text-to-Speech using gemini-3.1-flash-tts-preview
    let audioBase64: string | undefined = undefined;
    if (aiMode === "Voice") {
      try {
        console.log("Generating Speech for response using gemini-3.1-flash-tts-preview...");
        const ai = getGeminiClient();
        
        // Clean markdown tags for cleaner audio synthesis
        const cleanTextForTts = replyText
          .replace(/[#*`_-]/g, "")
          .substring(0, 300); // Limit length of synthesized text for performance

        const ttsResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: cleanTextForTts }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: user?.preferredVoice || "Sulafat" }, // User's chosen voice, falls back to warm default
              },
            },
          },
        });

        audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (audioBase64) {
          savedAiConv.audioBase64 = audioBase64;
          this.conversationRepository.save(savedAiConv);
        }
      } catch (ttsErr) {
        console.error("Gemini TTS Error:", ttsErr);
      }
    }

    return {
      response: savedAiConv,
      audioBase64
    };
  }

  public async generateTTS(text: string, userId: number): Promise<string> {
    try {
      console.log("Generating standalone Speech for text...");
      const ai = getGeminiClient();
      const user = this.userRepository.findById(userId);

      // Clean markdown tags for cleaner audio synthesis
      const cleanTextForTts = text
        .replace(/[#*`_-]/g, "")
        .substring(0, 300); // Limit length of synthesized text for performance

      const ttsResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: cleanTextForTts }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: user?.preferredVoice || "Sulafat" }, // User's chosen voice, falls back to warm default
            },
          },
        },
      });

      return ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
    } catch (err) {
      console.error("Standalone TTS generation error:", err);
      return "";
    }
  }
}
