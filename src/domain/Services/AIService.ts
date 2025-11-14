export interface AIService {
  /**
   * Generate a conversational reply for a general WhatsApp message.
   * Returns a cleaned string ready to be sent back to the user.
   */
  replyGeneralMessage(message: string): Promise<string>;
}
