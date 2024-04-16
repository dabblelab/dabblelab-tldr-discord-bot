import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { CommandInteraction, EmbedBuilder } from "discord.js";
import { getAudioUrlFromText } from "./getAudioUrlFromText";

interface DiscordContext {
  interaction: CommandInteraction;
  messageLimit: number;
  chatHistory: string;
  channelName: string;
  date: string;
  linkToUserMessage: string;
}

export async function getAIResponse(discordContext: DiscordContext) {
  try {
    const model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.5,
    });

    const promptTemplate = PromptTemplate.fromTemplate(
      `Create a summary of a chat conversation in the form of a numbered list. The user will enter a list of chats between two or more users. Your task is to return a summary such that a user can understand quickly what happened in the chat. The summary should be concise and capture the essence of the conversation. THE FINAL SUMMARY MUST NEVER EXCEED 4000 CHARACTERS.
      Following is the chat conversation between users:
      <chat_history>
        {input}
      </chat_history>`,
    );

    const chain = promptTemplate.pipe(model);

    try {
      const result = await chain.invoke({
        input: discordContext.chatHistory,
      });

      const summary = result.content;

      // console.log(summary);

      await discordContext.interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(
              `Summary of last ${discordContext.messageLimit} messages:`,
            )
            .setDescription(summary as string)
            .setTimestamp()
            .setFooter({
              text: `The audio version of this summary is being generated and will be sent soon. Please wait.`,
            }),
        ],
      });

      try {
        // generate audio file from the summary text
        const audioURL = await getAudioUrlFromText(`${summary}`);
        await discordContext.interaction.followUp({
          content: `Here is the audio version of this summary!`,
          files: [
            {
              attachment: audioURL,
              name: "chat_summary.mp3",
            },
          ],
          ephemeral: true,
        });

        return `${summary}
                You can listen to the summary [here](${audioURL}).
              `;
      } catch (e) {
        console.log((e as Error).message || e);
        return `${summary}`;
      }
    } catch (e) {
      console.log((e as Error).message);
      return `Could not generate summary due to error: ${(e as Error).message}`;
    }
  } catch (e) {
    console.error((e as Error).message);
    return `Could not generate summary due to error: ${(e as Error).message}`;
  }
}
