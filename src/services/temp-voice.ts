import { ChannelType, type VoiceState } from "discord.js";
import { addTempVoiceChannel, getGuildConfig, getTempVoiceChannel, removeTempVoiceChannel } from "./store.js";

export async function handleTempVoice(oldState: VoiceState, newState: VoiceState) {
  const oldChannel = oldState.channel;
  const newChannel = newState.channel;

  if (oldChannel && oldChannel.type === ChannelType.GuildVoice) {
    const tracked = await getTempVoiceChannel(oldChannel.id);
    if (tracked && oldChannel.members.size === 0) {
      await oldChannel.delete("Empty temporary voice channel").catch(() => null);
      await removeTempVoiceChannel(oldChannel.id);
    }
  }

  if (!newChannel || newChannel.type !== ChannelType.GuildVoice || !newState.member) return;

  const config = await getGuildConfig(newState.guild.id);
  if (!config.tempVoiceJoinChannelId || newChannel.id !== config.tempVoiceJoinChannelId) return;

  const tempChannel = await newState.guild.channels.create({
    name: `${newState.member.displayName}'s VC`.slice(0, 80),
    type: ChannelType.GuildVoice,
    parent: config.tempVoiceCategoryId ?? newChannel.parentId ?? undefined,
    permissionOverwrites: [
      {
        id: newState.member.id,
        allow: ["ManageChannels", "MoveMembers", "MuteMembers"]
      }
    ]
  });

  await addTempVoiceChannel({
    guildId: newState.guild.id,
    channelId: tempChannel.id,
    ownerId: newState.member.id,
    createdAt: new Date().toISOString()
  });

  await newState.setChannel(tempChannel, "Created temporary voice channel").catch(() => null);
}
