import { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { setServerConfig } from '../utils/serverConfig';
import { Command } from '../types';

const SetChannelCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('set-channel')
    .setDescription('Sets the channel for map rotation updates.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send updates to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as Command['data'],
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel', true) as TextChannel;

    setServerConfig(interaction.guildId, channel.id);

    await interaction.reply({
      content: `Map rotation updates will now be sent to #${channel.name}.`,
      ephemeral: true,
    });
  },
};

module.exports = SetChannelCommand;
