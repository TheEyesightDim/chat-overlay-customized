const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

let messages = [],
    emotes = [],
    userCache = {},
    maxMessages,
    ignoredUsers,
    badges,
    bttv,
    ffz,
    use_typewriter,
    print_rate,
    sentinel_char, //We're agreeing that this won't show up in normal chat. Ok?
    bad_text_char;

class MsgData {
    constructor(node, msg) {
        this.node = node;
        this.visible_node = node.querySelector(".visible");
        this.invisible_node = node.querySelector(".invisible");

        if (use_typewriter)
        {
            this.images = getImgNodes(msg);
            this.done = false;
            this.visible_text = "";
            this.invisible_text = replaceImgWithSentinel(msg);
        }
        else
        {
            this.visible_text = msg;
            this.invisible_text = "";
            this.done = true;
        }
    }
}

fetch('config.json')
    .then(r => r.json())
    .then(cfg => {
        maxMessages = cfg.maxMessages;
        ignoredUsers = cfg.ignoredUsers;
        badges = cfg.badges;
        bttv = cfg.bttv;
        ffz = cfg.ffz;
        use_typewriter = cfg.use_typewriter;
        print_rate = cfg.print_rate;
        sentinel_char = cfg.sentinel_char;
        bad_text_char = cfg.bad_text_char;
    });

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseRGB(str) {
    let s = str;
    if (s.startsWith("#"))
        s = s.slice(1);
    let i = parseInt(s, 16);
    return [(i >> 16) & 255, (i >> 8) & 255, i & 255];
}

function RGBtoHSL(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
        ? l === r
            ? (g - b) / s
            : l === g
                ? 2 + (b - r) / s
                : 4 + (r - g) / s
        : 0;
    return [
        60 * h < 0 ? 60 * h + 360 : 60 * h,
        100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
        (100 * (2 * l - s)) / 2,
    ];
}

function applyTypewriter() {
    messages
        .filter(msg => !msg.done)
        .forEach(msg => {
            let popped = msg.invisible_text.slice(0, 1);
            if (popped === sentinel_char)
            {
                popped = msg.images.shift();
            }
            msg.visible_text += popped;
            msg.invisible_text = msg.invisible_text.slice(1);
            if (msg.invisible_text === "")
            {
                msg.done = true;
            }
            msg.visible_node.innerHTML = msg.visible_text;
            msg.invisible_node.innerHTML = msg.invisible_text;
        });
}

function getImgNodes(str) {
    let tags = [...(str.match(/<img .*>/g) ?? [])];
    return tags;
}

function replaceImgWithSentinel(str) {
    return str.replaceAll(/<img .*>/g, sentinel_char);
}

function processEmotes(tags, message) {
    let newmsg = message,
        cls = 'emote',
        totalCount = 0,
        toReplace = [],
        regex,
        emote;
    if (tags.emotes)
    {
        let emotes = {};
        tags.emotes.split('/').forEach(x => {
            x = x.split(':');
            emotes[x[0]] = x[1].split(',');
        });
        Object.keys(emotes).forEach(x => {
            y = emotes[x][0].split('-').map(z => parseInt(z));
            emote = message.substring(y[0], y[1] + 1);
            emote = escapeRegExp(emote);
            regex = new RegExp(`${emote}\\s\|\\s${emote}\\s\|\\s${emote}\$`, 'g');
            totalCount += emotes[x].length;
            toReplace.push({
                'regex': regex,
                // 'src': `http://static-cdn.jtvnw.net/emoticons/v1/${x}/3.0` // deprecated in favor of new animated emotes
                'src': `https://static-cdn.jtvnw.net/emoticons/v2/${x}/default/dark/3.0`
            });
        });
    }
    if (emotes.length)
    {
        let count;
        for (j = 0; j < emotes.length; j++)
        {
            emote = emotes[j].name;
            emote = escapeRegExp(emote);
            regex = new RegExp(`${emote}\\s\|\\s${emote}\\s\|\\s${emote}\$`, 'g');
            count = (message.match(regex) || []).length;
            if (count === 0) continue;
            totalCount += count;
            toReplace.push({
                'regex': regex,
                'src': emotes[j].url
            });
        }
    }
    if (toReplace.length)
    {
        if (((bttv || ffz) && message.split(' ').length === totalCount) || tags['emote-only'] === '1')
        {
            cls = 'emoteonly';
        }
        toReplace.forEach(x => newmsg = newmsg.replace(x.regex, ` <img class="${cls}" src="${x.src}"> `));
    }
    return newmsg;
}

async function fetchFFZEmotes(data) {
    let response = await fetch(`https://api.frankerfacez.com/v1/room/${data['channel']}`);
    let json = await response.json();
    try
    {
        let set = json.room.set;
        let ffz = json.sets[`${set}`].emoticons;
        ffz.forEach(x => emotes.push({ 'name': x.name, 'url': x.urls[4] }));
    } catch (e)
    {
        console.log('unable to fetch ffz emotes');
    }
}

async function fetchBttvEmotes(data) {
    let channel_id = data['channel_id'];
    let channel = data['channel'];
    let auth = data['twitch_bot_token'];
    if (channel_id === undefined)
    {
        if (data['client_id'] === undefined)
        {
            console.log('unable to fetch bttv emotes, put channel/client id into tokens.json');
            return;
        }
        let response = await fetch(`https://api.twitch.tv/helix/users?login=${channel}`, {
            headers: {
                'Client-ID': data['client_id'],
                'Authorization': `Bearer ${auth}`
            }
        });
        let json = await response.json();
        json = json['data'][0];
        if (json === undefined)
        {
            console.log('unable to fetch channel id');
            return;
        }
        channel_id = json['id'];
        console.log(`channel_id - ${channel_id}`);
    }
    let bttv = [];
    let response;
    let json;
    try
    {
        response = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${channel_id}`);
        json = await response.json();
        bttv = json['channelEmotes'].concat(json['sharedEmotes']);
    } catch (e)
    {
        console.log('unable to fetch bttv channel emotes');
    }
    try
    {
        response = await fetch('https://api.betterttv.net/3/cached/emotes/global');
        json = await response.json();
        if (!Array.isArray(json)) throw e;
        bttv = bttv.concat(json);
    } catch (e)
    {
        console.log('unable to fetch bttv global emotes');
    }
    bttv.forEach(x => emotes.push({ 'name': x.code, 'url': `https://cdn.betterttv.net/emote/${x.id}/3x` }));
}

async function main() {

    let chat_msg_regex = /^@.*:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :/,
        data = await fetch('tokens.json').then(res => res.json()),
        password = `oauth:${data['twitch_bot_token']}`,
        channel = data['channel'];

    if (bttv) fetchBttvEmotes(data);
    if (ffz) fetchFFZEmotes(data);

    //interval callback to handle typewriter printing
    if (use_typewriter)
    {
        setInterval(
            applyTypewriter,
            1000 / print_rate);
    }

    socket.onopen = () => {
        socket.send(`PASS ${password}`);
        socket.send(`NICK ${channel}`);
        socket.send(`JOIN #${channel}`);
        socket.send('CAP REQ :twitch.tv/tags');
    };

    socket.onmessage = async function (event) {
        console.log(event.data);
        if (event.data.startsWith('PING :tmi.twitch.tv')) return socket.send('PONG :tmi.twitch.tv');
        let username = /display-name=(\w+);/.exec(event.data);
        if (!username) return;
        username = username[1];
        if (ignoredUsers.includes(username.toLowerCase())) return;

        //add user's profile image URL to cache
        if (userCache[username] === undefined)
        {
            let opt = {
                headers: {
                    'Client-ID': data['client_id'],
                    'Authorization': `Bearer ${data["api_oauth"]}`
                }
            };
            let res = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, opt);
            let struct = await res.json();
            console.log(struct);
            let imgURI = struct['data'][0]['profile_image_url'] ?? 'static/gogo.png';
            userCache[username] = imgURI;
        }
        let color = /color=(#[A-Fa-f0-9]{6})/.exec(event.data);
        if (color !== null) color = color[1];
        else color = '#aabbcc';

        let message = event.data.replace(chat_msg_regex, "");
        if (messages.length >= maxMessages)
        {
            let first = messages.shift().node;
            first.addEventListener('animationend', () => first.parentNode.removeChild(first));
            first.style.animation = 'fade-out 0.2s forwards';
        }

        let tags = {};
        event.data.split(';').forEach(x => {
            x = x.split('=');
            tags[x[0]] = x[1];
        });

        //replace things that look like HTML, 
        //-before- processing it for emotes (which insert HTML) 
        message = message.replace(/<\/?.+>|&lt;|&gt;|&#\d+;/gim, bad_text_char);

        let chatmsg = document.createElement('div');

        if (badges && tags.badges)
        {
            tags.badges = tags.badges.split(',').map(x => x.split('/'));
            tags.badges.forEach(x => chatmsg.insertAdjacentHTML("beforeend", `<img class="badge" src="static/${x[0]}${x[1]}.png">`));
        }

        message = processEmotes(tags, message);

        let hsl = RGBtoHSL(...parseRGB(color));
        chatmsg.style.setProperty("--user-h", hsl[0]);
        chatmsg.style.setProperty("--user-s", hsl[1] + "%");
        chatmsg.style.setProperty("--user-l", hsl[2] + "%");
        chatmsg.className = 'chatmsg';

        let img = `<img class="profile" src=${userCache[username]}>`;
        let name = `<span class="uname" style=color:${color}>${username}</span>`;
        chatmsg.insertAdjacentHTML("beforeend",
            `<div class="upper-part">${img} ${name}</div>
            <hr>
            <div class="writer">
            <span class="visible">${use_typewriter ? message : ""}</span>
            <span class="invisible"></span>
            </div>`);

        msg_struct = new MsgData(chatmsg, message);
        document.querySelector('#chatmsgs').appendChild(chatmsg);
        messages.push(msg_struct);
    };
}

main();
