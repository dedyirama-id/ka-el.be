export interface AIService {
  replyGeneralMessage(message: string): Promise<string>;
  proofreadingMessage(message: string): Promise<string>;
}
