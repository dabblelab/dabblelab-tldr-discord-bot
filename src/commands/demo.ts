import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import env from "dotenv";

// import { getAIResponse } from "../services/getAIResponse";

env.config();

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!");

export async function execute(interaction: CommandInteraction) {
  try {
    const input =
      "Hey there, hurray, looks like the file upload is working absolutely correctly.";

    // const aIResponse = await getAIResponse(input);

    return interaction.reply(input);

    // return interaction.reply({
    //   // embeds: [summaryEmbed],
    //   files: [
    //     {
    //       attachment: fileURL,
    //       name: "chat_summary.mp3",
    //     },
    //   ],
    // });
  } catch (err) {
    console.error(err);
    return interaction.reply("Error processing request." + err.message || err);
  }
}
