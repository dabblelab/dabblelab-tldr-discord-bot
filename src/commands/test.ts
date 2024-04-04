import env from "dotenv";
import {
  Collection,
  CommandInteraction,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import { getAIResponse } from "../services/getAIResponse";

env.config();

export const data = new SlashCommandBuilder()
  .setName("test")
  .setDescription("For testing purpose only.");

export async function execute(interaction: CommandInteraction) {
  try {
    await interaction.deferReply();
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

    const response = await getAIResponse(chatHistory);

    await interaction.user.send(response); // reply in the DM
    return interaction.editReply("I have sent you the response in DM."); // informing that the DM has been sent

    // return interaction.editReply(response); // reply in the chat itself
  } catch (err) {
    console.error(err);
    return interaction.reply("Error processing request." + err.message || err);
  }
}
