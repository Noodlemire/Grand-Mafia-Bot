-------------------------------------------------------------------------------------------------------------
Grand Mafia Bot
-------------------------------------------------------------------------------------------------------------

This is a hybrid Slash/Prefix Command Bot designed to run Mafia in nearly any format imaginable, or even any game hosted on Discord, so long as it has need for a bot that can show infocards from custom commands. In addition, it can handle private communications (whispers) between different player channels, and it has an automatic channel-to-channel message relay system.

Most commands come in both Slash and Prefix forms, but due to benefits and restrictions exclusive to Slash Commands, some commands are only available in one form or another.

﻿-------------------------------------------------------------------------------------------------------------
Structures
-------------------------------------------------------------------------------------------------------------

A Structure is an abstract concept, and the basis of all infocards. It is any type of object that the bot can track. The concept of Roles can be one Structure. The concept of Cards can be another. Create one using the /create_structure command!

Each new Structure adds a /register, /list, and /rand Guild Slash Command for the object type that you added. Registered objects add new Prefix commands with each provided alias, with automatic handling of duplicate aliases if they ever show up.

For Grand Idea Games, you may allow regular users to submit new commands using the /user_submission command.

-------------------------------------------------------------------------------------------------------------
Making your own Grand Mafia Bot
-------------------------------------------------------------------------------------------------------------

First, create a bot account and add it to your own server.
https://discordpy.readthedocs.io/en/stable/discord.html

Then, install Node.js and discord.js onto your PC, or whatever you decide to use for hosting. Make sure it's something that will allow the program to write its own local storage.
https://nodejs.org/en/
https://discord.js.org/

Lastly, put your bot account's TOKEN into the file "example.store.json" and then rename it to ".store.json"

From there, you should be able to run the bot using the Terminal prompt command: "./server.sh" as long as it's situated within the root of the bot's code. You want that file in particular, as it can automatically restart the bot in case anything ever goes wrong, as long as your machine itself is still running.

You should probably delete the contents of the 'custom' folder, assuming you're running this bot entirely for your own server.
