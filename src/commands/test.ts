import env from "dotenv";
import {
  Collection,
  CommandInteraction,
  Message,
  SlashCommandBuilder,
} from "discord.js";

env.config();

export const data = new SlashCommandBuilder()
  .setName("test")
  .setDescription("For testing purpose only.");

export async function execute(interaction: CommandInteraction) {
  try {
    const messages: Collection<string, Message> =
      await interaction.channel.messages.fetch({
        limit: 50,
      });

    messages.reverse();

    let chatHistory = "<chat_history>\n";
    messages.forEach((message) => {
      if (message.author.bot) return;
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

    return interaction.reply(chatHistory);
  } catch (err) {
    console.error(err);
    return interaction.reply("Error processing request." + err.message || err);
  }
}
