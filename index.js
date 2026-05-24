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

// ========== COOLDOWN SYSTEM ==========
// Stores last reply time for each user
const cooldowns = new Map();
const COOLDOWN_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

// ========== MULTIPLE REPLY MESSAGES ==========
const replyMessages = [
    "Yo @%sender%, %owner% is sleeping. Try again later ",
    "@%sender% %owner% is offline. DM if important ",
    "%owner% ain't here rn @%sender% . He'll see your message when he's back",
    "Hey @%sender%, thanks for pinging! %owner% will reply soon as he's online",
    "Noted @%sender%! %owner% is away but will get back to you"
];

// ========== SPECIAL REPLIES WHEN BOT IS PINGED (CORRECTION MESSAGES) ==========
const botPingReplies = [
    "Hey @%sender%, you've got the wrong person! You meant to ping <@%owner_id%> not me.",
    "@%sender% I think you made a mistake - I'm just his assistant! You want <@%owner_id%>.",
    "Oops @%sender%! You pinged me by accident. <@%owner_id%> is who you're looking for.",
    "@%sender% You've mistaken me for <@%owner_id%>! I'm just his assistant, not him.",
    "Hey @%sender%, I'm not %owner_name%! You want <@%owner_id%> for that",
    "Sorry @%sender%, but I'm not %owner_name%! Please ping <@%owner_id%> instead."
];

// Helper function to get a random reply message (for user pings)
function getRandomReply(senderName, ownerName) {
    const randomIndex = Math.floor(Math.random() * replyMessages.length);
    let message = replyMessages[randomIndex];
    message = message.replace(/%sender%/g, senderName);
    message = message.replace(/%owner%/g, ownerName);
    return message;
}

// Helper function for bot ping replies (correction messages)
function getRandomBotReply(senderName, ownerName, ownerId) {
    const randomIndex = Math.floor(Math.random() * botPingReplies.length);
    let message = botPingReplies[randomIndex];
    message = message.replace(/%sender%/g, senderName);
    message = message.replace(/%owner_name%/g, ownerName);
    message = message.replace(/%owner_id%/g, ownerId);
    return message;
}

client.once(Events.ClientReady, async (c) => {
    console.log(`✅ ${c.user.tag} is online and acting as your PA!`);
    console.log(`📡 Monitoring pings for user ID: ${YOUR_USER_ID}`);
    console.log(`🤖 Active in ${client.guilds.cache.size} servers`);
    console.log(`📋 Servers:`);
    
    client.guilds.cache.forEach(guild => {
        console.log(`   - ${guild.name} (${guild.id})`);
    });
    
    console.log(`\n🎯 Bot is ready! Set your status to offline/invisible to activate auto-replies.`);
    console.log(`🔔 SPECIAL FEATURE: Bot will CORRECT people when they ping it by mistake`);
    console.log(`⏰ Cooldown for user pings: ${COOLDOWN_TIME / 60000} minutes per user`);
    console.log(`💬 Loaded ${replyMessages.length} random reply messages for user pings`);
    console.log(`💬 Loaded ${botPingReplies.length} correction messages for bot pings`);
    
    // ========== AUTO-NICKNAME SYNC ==========
    async function syncBotNickname() {
        for (const guild of client.guilds.cache.values()) {
            try {
                const yourMember = await guild.members.fetch(YOUR_USER_ID);
                const botMember = await guild.members.fetch(client.user.id);
                
                const yourDisplayName = yourMember?.nickname || yourMember?.user.globalName || yourMember?.user.username;
                
                if (yourDisplayName && botMember) {
                    const botNickname = yourDisplayName;
                    await botMember.setNickname(botNickname);
                    console.log(`   📝 Synced nickname in ${guild.name} to: ${botNickname}`);
                }
            } catch (error) {
                // Silently fail - bot might not have perms in some servers
            }
        }
    }
    
    setInterval(syncBotNickname, 60000);
    syncBotNickname();
    // ========================================
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    // ========== SPECIAL CASE: BOT IS PINGED DIRECTLY ==========
    const isBotMentioned = message.mentions.users.has(client.user.id);
    
    if (isBotMentioned) {
        const senderMember = message.guild.members.cache.get(message.author.id);
        const senderDisplayName = senderMember?.nickname || message.author.globalName || message.author.username;
        
        // Get your info for the correction message
        let yourMember = message.guild.members.cache.get(YOUR_USER_ID);
        if (!yourMember) {
            try {
                yourMember = await message.guild.members.fetch(YOUR_USER_ID);
            } catch (error) {
                console.log(`⚠️ Could not fetch your info: ${error.message}`);
            }
        }
        
        const yourDisplayName = yourMember?.nickname || yourMember?.user.globalName || yourMember?.user.username || "the user";
        
        pingCount++;
        console.log(`\n🤖 BOT PING #${pingCount} (MISTAKEN IDENTITY)`);
        console.log(`   From: ${message.author.tag} (${senderDisplayName})`);
        console.log(`   Server: ${message.guild.name}`);
        console.log(`   Channel: #${message.channel.name}`);
        console.log(`   Message: ${message.content.slice(0, 50)}${message.content.length > 50 ? '...' : ''}`);
        
        try {
            // Get a random correction message
            const replyMessage = getRandomBotReply(senderDisplayName, yourDisplayName, YOUR_USER_ID);
            
            await message.reply({
                content: replyMessage,
                allowedMentions: { 
                    users: [message.author.id, YOUR_USER_ID]
                }
            });
            
            console.log(`   ✅ Corrected ${senderDisplayName} (they pinged bot by mistake)`);
        } catch (error) {
            console.error(`   ❌ Failed to reply: ${error.message}`);
        }
        return; // Don't process further (skip normal user ping logic)
    }
    
    // ========== NORMAL CASE: USER IS PINGED ==========
    const isUserMentioned = message.mentions.users.has(YOUR_USER_ID);
    if (!isUserMentioned) return;
    
    // ========== CHECK COOLDOWN ==========
    const userId = message.author.id;
    const now = Date.now();
    const lastReply = cooldowns.get(userId);
    
    if (lastReply && (now - lastReply) < COOLDOWN_TIME) {
        const remainingTime = Math.ceil((COOLDOWN_TIME - (now - lastReply)) / 1000 / 60);
        console.log(`   ⏰ Cooldown active for ${message.author.tag} - ${remainingTime} minutes remaining`);
        return; // Don't reply
    }
    
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
    const yourDisplayName = yourMember?.nickname || yourMember?.user.globalName || yourMember?.user.username;
    
    console.log(`\n📨 User Ping #${pingCount}`);
    console.log(`   From: ${message.author.tag} (${senderDisplayName})`);
    console.log(`   Server: ${message.guild.name}`);
    console.log(`   Channel: #${message.channel.name}`);
    console.log(`   Your status: ${status || 'offline/invisible'}`);
    console.log(`   Will reply: ${isOffline ? 'YES ✅' : 'NO (you are online)'}`);
    
    if (!isOffline) return;
    
    try {
        // Get a random reply message
        const replyMessage = getRandomReply(senderDisplayName, yourDisplayName);
        
        await message.reply({
            content: replyMessage,
            allowedMentions: { 
                users: [message.author.id]
            }
        });
        
        // Update cooldown after successful reply
        cooldowns.set(userId, now);
        
        console.log(`   ✅ Replied to ${senderDisplayName}`);
        console.log(`   📝 Used message ${(pingCount % replyMessages.length) + 1}/${replyMessages.length}`);
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
