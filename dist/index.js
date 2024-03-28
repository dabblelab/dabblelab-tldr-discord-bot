"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = require("./utils/config");
const commands_1 = require("./commands");
const deploy_commands_1 = require("./utils/deploy-commands");
const client = new discord_js_1.Client({
    intents: ["Guilds", "GuildMessages", "DirectMessages"],
});
client.once("ready", () => {
    console.log("Discord bot is ready! 🤖");
});
client.on("guildCreate", async (guild) => {
    console.log(`Joined a new guild: ${guild.name}`);
    await (0, deploy_commands_1.deployCommands)({ guildId: guild.id });
});
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) {
        console.log("Not a command interaction");
        return;
    }
    const { commandName } = interaction;
    if (commands_1.commands[commandName]) {
        commands_1.commands[commandName].execute(interaction);
    }
});
client.login(config_1.config.DISCORD_TOKEN);
//# sourceMappingURL=index.js.map