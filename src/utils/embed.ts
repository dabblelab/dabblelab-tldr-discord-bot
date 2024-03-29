import { EmbedBuilder } from "discord.js";

export function creteSummaryEmbed({ title, description, fileUrl }) {
  return (
    new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(title)
      .setURL(fileUrl)
      .setDescription(description)
      // .setThumbnail("https://i.imgur.com/AfFp7pu.png")
      .setTimestamp()
  );
}
