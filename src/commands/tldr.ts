import {
  Collection,
  CommandInteraction,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import { getAIResponse } from "../services/getAIResponseV3";

export const data = new SlashCommandBuilder()
  .setName("tldr")
  .setDescription(
    "Generates a summary of the chat conversation in both text as well as audio format.",
  )
  .addIntegerOption((option) =>
    option
      .setName("message_count")
      .setDescription("The number of messages to summarize.")
      .setMinValue(1)
      .setMaxValue(100),
  );

export async function execute(interaction: CommandInteraction) {
  try {
    const messageLimit = interaction.options.get("message_count")?.value ?? 50;

    await interaction.deferReply({ ephemeral: true });

    const messages: Collection<string, Message> =
      await interaction.channel.messages.fetch({
        limit: messageLimit as number,
      });

    messages.reverse();

    let chatHistory = "<chat_history>\n";
    messages.forEach((message) => {
      if (message.author.id === interaction.client.user.id) return; // ignore bot messages (including this one
      if (!message.content && message.attachments.size === 0) return;

      chatHistory += `${
        message.author.displayName || message.author.username
      }: ${
        message.attachments.size > 0
          ? message.attachments.first().proxyURL
          : message.content
      }\n`;
    });
    chatHistory += "</chat_history>";

    const channelName = interaction.channel.name;
    const date = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
    const linkToUserMessage = `https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${interaction.id}`;

    return await getAIResponse({
      interaction,
      messageLimit: messageLimit as number,
      chatHistory,
      channelName,
      date,
      linkToUserMessage,
    });
    // console.log("response", response);
  } catch (err) {
    console.error(err);
    return interaction.reply("Error processing request." + err.message || err);
  }
}
