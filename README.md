# chat-overlay

simple on-screen twitch chat, supports twitch badges, bttv, ffz and twitch emotes  



## Install

### `tokens.json`

create `tokens.json` with the following attributes:

- `channel` - Twitch username in lower case.
- `twitch_bot_token` - OAuth token acting as Twitch chat password, obtain with [twitchapps](https://twitchapps.com/tmi/).
- `api_oauth` - OAuth app [access token](https://dev.twitch.tv/docs/authentication#app-access-tokens) for interacting with the Twitch API using [client credentials grant flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow).

Additionally, for bttv emotes:  

- `channel_id` - if omitted, obtained automatically using `client_id`.
- `client_id` - Twitch application client id, create app in [twitch dev console](https://dev.twitch.tv/console/apps)  

### server

run server, add browser source in obs  

Node.js http-server:  

    npm install http-server -g
    cd chat-overlay
    http-server

### config.json

`maxMessages` (integer): max number of messages on screen at once  
`ignoredUsers` (array of strings): twitch usernames in lower case, ignored user's messages not displayed  
`badges` (boolean): show badges?  
`bttv` (boolean): fetch and display bttv emotes?  
`ffz` (boolean): fetch and display ffz emotes?  
