import { CommandInteraction, EmbedBuilder } from "discord.js";
import { getAudioUrlFromText } from "./getAudioUrlFromText";
import { createEpisode } from "../lib/podcast";
import { getChatSummaryOfHistory } from "../lib/langchain";

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
    const summary = await getChatSummaryOfHistory(discordContext.chatHistory);
    console.log({ summary });
    const title = `Summary of last ${discordContext.messageLimit} messages:`;

    await discordContext.interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(title as string)
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
      // Update Podcast Episode
      await createEpisode(
        discordContext.interaction,
        title,
        summary as string,
        audioURL,
      );

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
}
