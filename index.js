const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/keep-alive', (req, res) => {
    res.send('Bot is alive and kicking!');
});

app.listen(port, () => {
    console.log(`Keep-alive server listening on port ${port}`);
});

const { Client, GatewayIntentBits, Events } = require('discord.js');

const BOT_TOKEN = process.env.BOT_TOKEN;
const YOUR_USER_ID = process.env.YOUR_USER_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

let pingCount = 0;

client.once(Events.ClientReady, async (c) => {
    console.log(`✅ ${c.user.tag} is online and acting as your PA!`);
    console.log(`📡 Monitoring pings for user ID: ${YOUR_USER_ID}`);
    console.log(`🤖 Active in ${client.guilds.cache.size} servers`);
    console.log(`📋 Servers:`);
    
    client.guilds.cache.forEach(guild => {
        console.log(`   - ${guild.name} (${guild.id})`);
    });
    
    console.log(`\n🎯 Bot is ready! Set your status to offline/invisible to activate auto-replies.`);
    
    // ========== AUTO-NICKNAME SYNC ==========
    async function syncBotNickname() {
        for (const guild of client.guilds.cache.values()) {
            try {
                const yourMember = await guild.members.fetch(YOUR_USER_ID);
                const botMember = await guild.members.fetch(client.user.id);
                
                const yourDisplayName = yourMember?.nickname || yourMember?.user.globalName || yourMember?.user.username;
                
                if (yourDisplayName && botMember) {
                    const botNickname = yourDisplayName; // Bot uses same name as you
                    await botMember.setNickname(botNickname);
                    console.log(`   📝 Synced nickname in ${guild.name} to: ${botNickname}`);
                }
            } catch (error) {
                // Silently fail - bot might not have perms in some servers
            }
        }
    }
    
    // Run sync every minute
    setInterval(syncBotNickname, 60000);
    syncBotNickname(); // Run once immediately
    // ========================================
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    const isMentioned = message.mentions.users.has(YOUR_USER_ID);
    if (!isMentioned) return;
    
    // Force fetch your member data with presence
    let yourMember = message.guild.members.cache.get(YOUR_USER_ID);
    if (!yourMember || !yourMember.presence) {
        try {
            yourMember = await message.guild.members.fetch({
                user: YOUR_USER_ID,
                force: true,
                withPresences: true
            });
        } catch (error) {
            console.log(`⚠️ Could not fetch your presence: ${error.message}`);
        }
    }
    
    if (!yourMember) {
        console.log(`⚠️ Could not find you in server: ${message.guild.name}`);
        return;
    }
    
    // Treat unknown status as offline
    const status = yourMember.presence?.status;
    const isOffline = !status || status === 'offline' || status === 'invisible';
    
    const senderMember = message.guild.members.cache.get(message.author.id);
    const senderDisplayName = senderMember?.nickname || message.author.globalName || message.author.username;
    const yourDisplayName = yourMember?.nickname || client.user.globalName || client.user.username;
    
    pingCount++;
    console.log(`\n📨 Ping #${pingCount}`);
    console.log(`   From: ${message.author.tag} (${senderDisplayName})`);
    console.log(`   Server: ${message.guild.name}`);
    console.log(`   Channel: #${message.channel.name}`);
    console.log(`   Your status: ${status || 'offline/invisible'}`);
    console.log(`   Will reply: ${isOffline ? 'YES ✅' : 'NO (you are online)'}`);
    
    if (!isOffline) return;
    
    try {
        const replyMessage = `Hello @${senderDisplayName}, I am assistant of ${yourDisplayName}. If your message is important please DM to ${yourDisplayName}!`;
        
        await message.reply({
            content: replyMessage,
            allowedMentions: { 
                users: [message.author.id]
            }
        });
        console.log(`   ✅ Replied to ${senderDisplayName}`);
    } catch (error) {
        console.error(`   ❌ Failed to reply: ${error.message}`);
    }
});

client.on(Events.Error, (error) => {
    console.error('❌ Bot error:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

client.login(BOT_TOKEN);
