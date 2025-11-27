import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";
import { setServerConfig } from "../utils/serverConfig";
import { appendServerInfo } from "../utils/googleSheets";
import { postOrUpdateInChannel } from "../utils/messageManager";
import { Command } from "../types";
import { logger } from "../utils/logger";

const SetChannelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("set-channel")
    .setDescription("Sets the channel for map rotation updates.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to send updates to")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(
      PermissionFlagsBits.Administrator
    ) as Command["data"],

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    // IMPORTANT: Prevent "Unknown interaction" error
    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = interaction.options.getChannel(
        "channel",
        true
      ) as TextChannel;

      setServerConfig(interaction.guildId, channel.id);

      logger.info(
        `✅ set-channel configured for server: ${interaction.guild?.name} (ID: ${interaction.guildId}), channel: #${channel.name} (${channel.id})`
      );

      // Save to Google Sheets
      await appendServerInfo(
        interaction.guildId,
        channel.id,
        interaction.guild?.name || "Unknown"
      );

      // Trigger map status update in the selected channel
      await postOrUpdateInChannel(interaction.client, channel.id);

      // Final response after long operations
      await interaction.editReply(
        `Map rotation updates will now be sent to #${channel.name}.`
      );
    } catch (err) {
      logger.error({ err }, "Error executing /set-channel");

      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply(
          "An error occurred while setting the channel."
        );
      }
    }
  },
};

module.exports = SetChannelCommand;
