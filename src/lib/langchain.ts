import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

export async function getChatSummaryOfHistory(
  chatHistory: string,
  channelName: string,
  summaryDate: string,
) {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.5,
  });
  const promptTemplate = PromptTemplate.fromTemplate(
    `Create a plain text summary of the entire chat conversation with proper punctuations. The user will enter a list of chats between two or more users. Your task is to return a summary such that a user can understand quickly what happened in the chat. The summary should be concise and capture the essence of the conversation. THE FINAL SUMMARY MUST NEVER EXCEED 4000 CHARACTERS.
      Following is the chat conversation between users:
      <chat_history>
        {input}
      </chat_history>`,
  );
  const chain = promptTemplate.pipe(model);
  console.log("Generating summary");
  const result = await chain.invoke({
    input: chatHistory,
  });

  const summaryPrefix = `This is a summary for ${channelName} on ${summaryDate}. `;
  const summary = summaryPrefix + result.content;
  return summary;
}
