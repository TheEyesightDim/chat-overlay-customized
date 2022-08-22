# chat-overlay

Simple on-screen twitch chat, supports twitch badges, bttv, ffz and twitch emotes.

Forked from Ciremun's [chat-overlay](https://github.com/Ciremun/chat-overlay) with support for Twitch's new animated emotes and typewriter effect for chat messages.

## Preview

https://user-images.githubusercontent.com/9030935/185836373-7b291cdd-d6e3-4fe6-8b06-ffa6eaa14fba.mp4


## Install

### `tokens.json`

create `tokens.json` with the following attributes:

- `channel` - Twitch username in lower case.
- `twitch_bot_token` - OAuth token acting as Twitch chat password, obtain with [twitchapps](https://twitchapps.com/tmi/).
- `api_oauth` - OAuth app [access token](https://dev.twitch.tv/docs/authentication#app-access-tokens) for interacting with the Twitch API using [client credentials grant flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#client-credentials-grant-flow).

Additionally, for bttv emotes:  

- `channel_id` - if omitted, obtained automatically using `client_id`.
- `client_id` - Twitch application client id, create app in [twitch dev console](https://dev.twitch.tv/console/apps)  

### Run The Server

Serve the root of the repository, and add the address as a browser source in OBS, e.g. `http://localhost:8080`.

#### Node.js `http-server`:  
Install the `http-server` module globally if you haven't already:
    
    npm install http-server -g
        
Then serve the directory.   
    
    cd chat-overlay
    http-server
    
Python 3 `http.server` module:

    python -m http.server 8080

### `config.json`

- `maxMessages` (integer): max number of messages on screen at once  
- `ignoredUsers` (array of strings): twitch usernames in lower case, ignored user's messages not displayed  
- `badges` (boolean): show badges?  
- `bttv` (boolean): fetch and display bttv emotes?  
- `ffz` (boolean): fetch and display ffz emotes?
- `use_typewriter` (boolean): Display messages with typewriter effect?
- `print_rate` (integer): Number of characters per second to display with the typewriter effect. It has no effect if `use_typewriter === false`.
- `sentinel_char` (string): A sentinel character used internally for inserting GIFs with the typewriter effect. Not recommended to change.
- `bad_text_char` (string): A character or string to replace any HTML in users' chat messages.
