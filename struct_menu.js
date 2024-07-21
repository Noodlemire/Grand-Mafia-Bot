let registerMenus = {};

module.exports = (g) =>
{
	const {UTILS, SERVER_DATA, CUSTOMDIR, path, fs, EmbedBuilder, StructObj, add_gcmd, overwrite, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle} = g;

	//256 + 2003 + 5*(32 + 256) + 7 + 5 + 2*+(750+256+16) + 32 + 50 = 5837/6000
	function updateFields(menu)
	{
		let fields = [...menu.pfields, {name: "Created by:", value: "<@" + menu.author + ">", inline: true}];
		let keys = Object.keys(menu.meta);

		for(let i = 0; i < fields.length-1; i++)
			fields[i].name = UTILS.titleCase(fields[i].name);

		if(menu.fields.length > 0)
		{
			let txt = "";
			let limited = false;

			for(let i = 0; i < menu.fields.length; i++)
			{
				if(menu.fields[i].name[menu.fields[i].name.length-1] !== ":")
					menu.fields[i].name += ":";

				if(!limited)
				{
					if(i > 0) txt += "\n";
					txt += i + ": " + menu.fields[i].name;

					if(txt.length > 750 && i < menu.fields.length-1)
					{
						txt += "\n...And " + (menu.fields.length-i-1) + " more.";
						limited = true;
					}
				}
			}

			fields[fields.length] = {name: "Fields:", value: txt};
			menu.time = new Date().getTime();
		}

		if(keys.length > 0)
		{
			let txt = UTILS.titleCase(keys[0]);

			for(let i = 1; i < keys.length; i++)
			{
				txt += "\n" + UTILS.titleCase(keys[i]);

				if(txt.length > 750 && i < keys.length-1)
				{
					txt += "\n...And " + (keys.length-i-1) + " more.";
					break;
				}
			}

			fields[fields.length] = {name: "Meta:", value: txt};
		}

		menu.embed.setFields(fields);

		if(menu.color === "random")
			menu.embed.setColor(UTILS.rHex(6));
	}

	UTILS.registerInteraction("struct:addfield", (interaction) =>
	{
		if(registerMenus[interaction.member.id].message.id !== interaction.message.id)
			return true;

		let modal = new ModalBuilder().setCustomId("struct:addfieldModal").setTitle("Add Field").setComponents(
			[
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "struct:addfieldName",
					label: "Name",
					style: TextInputStyle.Short,
					maxLength: 256
				})]}),
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "struct:addfieldBody",
					label: "Body",
					style: TextInputStyle.Paragraph,
					maxLength: 1024
				})]}),
			]
		);

		interaction.showModal(modal).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:addfieldModal", (interaction) =>
	{
		interaction.deferUpdate().then(() =>
		{
			let menu = registerMenus[interaction.member.id];
			let name = UTILS.titleCase(interaction.fields.getTextInputValue("struct:addfieldName"));
			let value = interaction.fields.getTextInputValue("struct:addfieldBody");

			menu.fields[menu.fields.length] = {name, value};
			updateFields(menu);

			interaction.editReply({embeds: [menu.embed]});
		}).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:repfield", (interaction) =>
	{
		if(registerMenus[interaction.member.id].message.id !== interaction.message.id)
			return true;

		let modal = new ModalBuilder().setCustomId("struct:repfieldModal").setTitle("Replace Field").setComponents(
			[
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "struct:repfieldID",
					label: "Numeric ID",
					style: TextInputStyle.Short,
					maxLength: 3
				})]}),
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "struct:repfieldName",
					label: "Name (Unchanged if blank)",
					style: TextInputStyle.Short,
					maxLength: 256,
					required: false
				})]}),
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "struct:repfieldBody",
					label: "Body (Unchanged if blank)",
					style: TextInputStyle.Paragraph,
					maxLength: 1024,
					required: false
				})]}),
			]
		);

		interaction.showModal(modal).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:repfieldModal", (interaction) =>
	{
		interaction.deferUpdate().then(() =>
		{
			let menu = registerMenus[interaction.member.id];
			let id = interaction.fields.getTextInputValue("struct:repfieldID");

			if(!menu.fields[id]) return false;

			let name = UTILS.titleCase(interaction.fields.getTextInputValue("struct:repfieldName") || menu.fields[id].name);
			let value = interaction.fields.getTextInputValue("struct:repfieldBody") || menu.fields[id].value;

			menu.fields[id] = {name, value};
			updateFields(menu);

			interaction.editReply({embeds: [menu.embed]});
		}).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:delfield", (interaction) =>
	{
		if(registerMenus[interaction.member.id].message.id !== interaction.message.id)
			return true;

		let modal = new ModalBuilder().setCustomId("struct:delfieldModal").setTitle("Delete Field").setComponents(
			[
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "struct:delfieldID",
					label: "Numeric ID",
					style: TextInputStyle.Short,
					maxLength: 3
				})]}),
			]
		);

		interaction.showModal(modal).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:delfieldModal", (interaction) =>
	{
		interaction.deferUpdate().then(() =>
		{
			let menu = registerMenus[interaction.member.id];
			let id = interaction.fields.getTextInputValue("struct:delfieldID");

			if(!menu.fields[id]) return false;

			menu.fields.splice(id, 1);
			updateFields(menu);

			interaction.editReply({embeds: [menu.embed]});
		}).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:setmeta", (interaction) =>
	{
		if(registerMenus[interaction.member.id].message.id !== interaction.message.id)
			return true;

		let modal = new ModalBuilder().setCustomId("struct:setmetaModal").setTitle("Set Metadata").setComponents(
			[
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "struct:setmetaKey",
					label: "Key (See /object_meta command for key names)",
					style: TextInputStyle.Short,
					maxLength: 256
				})]}),
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "struct:setmetaValue",
					label: "Value",
					style: TextInputStyle.Paragraph,
				})]}),
			]
		);

		interaction.showModal(modal).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:setmetaModal", (interaction) =>
	{
		interaction.deferUpdate().then(() =>
		{
			let menu = registerMenus[interaction.member.id];
			let key = UTILS.toArgName(interaction.fields.getTextInputValue("struct:setmetaKey"), true);
			let value = interaction.fields.getTextInputValue("struct:setmetaValue");

			menu.meta[key] = value;
			updateFields(menu);

			interaction.editReply({embeds: [menu.embed]});
		}).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:delmeta", (interaction) =>
	{
		if(registerMenus[interaction.member.id].message.id !== interaction.message.id)
			return true;

		let modal = new ModalBuilder().setCustomId("struct:delmetaModal").setTitle("Delete Metadata").setComponents(
			[
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "struct:delmetaKey",
					label: "Key",
					style: TextInputStyle.Short,
					maxLength: 256
				})]}),
			]
		);

		interaction.showModal(modal).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:delmetaModal", (interaction) =>
	{
		interaction.deferUpdate().then(() =>
		{
			let menu = registerMenus[interaction.member.id];
			let key = UTILS.toArgName(interaction.fields.getTextInputValue("struct:delmetaKey"), true);

			if(!menu.meta[key]) return false;

			delete menu.meta[key];
			updateFields(menu);

			interaction.editReply({embeds: [menu.embed]});
		}).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:setdesc", (interaction) =>
	{
		if(registerMenus[interaction.member.id].message.id !== interaction.message.id)
			return true;

		let modal = new ModalBuilder().setCustomId("struct:descModal").setTitle("Set Description").setComponents([
			new ActionRowBuilder({components: [new TextInputBuilder({
				customID: "struct:descModalTI",
				label: "Description",
				style: TextInputStyle.Paragraph
			})]})
		]);

		interaction.showModal(modal).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:descModal", (interaction) =>
	{
		interaction.deferUpdate().then(() =>
		{
			let menu = registerMenus[interaction.member.id];
			let desc = interaction.fields.getTextInputValue("struct:descModalTI");

			menu.desc = desc;
			menu.embed.setDescription(desc.length > 1000 ? desc.substring(0, 2000) + "..." : desc);

			interaction.editReply({embeds: [menu.embed]});
		}).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:deldesc", (interaction) =>
	{
		if(registerMenus[interaction.member.id].message.id !== interaction.message.id)
			return true;

		interaction.deferUpdate().then(() =>
		{
			let menu = registerMenus[interaction.member.id];

			delete menu.desc;
			menu.embed.setDescription(null);

			interaction.editReply({embeds: [menu.embed]});
		}).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:setparam", (interaction) =>
	{
		if(registerMenus[interaction.member.id].message.id !== interaction.message.id)
			return true;

		let modal = new ModalBuilder().setCustomId("struct:setparamModal").setTitle("Set Param").setComponents(
			[
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "struct:setparamName",
					label: "Name",
					style: TextInputStyle.Short,
					maxLength: 256
				})]}),
				new ActionRowBuilder({components: [new TextInputBuilder({
					customID: "struct:setparamValue",
					label: "Value",
					style: TextInputStyle.Short,
					maxLength: 256
				})]}),
			]
		);

		interaction.showModal(modal).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:setparamModal", (interaction) =>
	{
		interaction.deferUpdate().then(() =>
		{
			let menu = registerMenus[interaction.member.id];
			let name = UTILS.toArgName(interaction.fields.getTextInputValue("struct:setparamName"));
			let value = interaction.fields.getTextInputValue("struct:setparamValue");
			let success = false;

			if(name[name.length-1] === ":")
				name = name.substring(0, name.length-1);

			for(let i = 0; i < menu.pfields.length; i++)
			{
				if(menu.pfields[i].name === UTILS.titleCase(name) + ":")
				{
					menu.pfields[i].value = value;
					success = true;
					break;
				}
			}

			if(!success)
				return true;

			if(!menu.color || !menu.iconURL)
			{
				let sdata = SERVER_DATA[menu.message.guild.id].structs;
				if(sdata && name === sdata[menu.struct].getParent())
				{
					let parent = sdata[menu.struct].getParentObj(value);

					if(parent)
					{
						if(!menu.color) menu.embed.setColor(parent.getColor() || "808080");
						if(!menu.iconURL) menu.embed.setAuthor({name: menu.title, iconURL: parent.getIconURL()})
					}
					else
					{
						if(!menu.color) menu.embed.setColor("808080");
						if(!menu.iconURL) menu.embed.setAuthor({name: menu.title});
					}
				}
			}

			menu.params[name] = value;
			updateFields(menu);

			interaction.editReply({embeds: [menu.embed]});
		}).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:cancel", (interaction) =>
	{
		if(registerMenus[interaction.member.id].message.id !== interaction.message.id)
			return true;

		interaction.deferUpdate().then(() =>
		{
			delete registerMenus[interaction.member.id];
			interaction.editReply({content: "```diff\n-Menu closed.\n```", embeds: [], components: []});
		}).catch(console.error);

		return true;
	});

	UTILS.registerInteraction("struct:submit", (interaction) =>
	{
		if(registerMenus[interaction.member.id].message.id !== interaction.message.id)
			return true;

		interaction.deferUpdate().then(() =>
		{
			let menu = registerMenus[interaction.member.id];
			let locked = SERVER_DATA[interaction.guild.id].locked;

			if(menu.obj)
			{
				let obj = menu.obj;
				let changelog = (locked ? "Queued e" : "E") + "dits to " + obj.getStructType() + " \"" + menu.title + "\" with ID: ID" + obj.getID();
				let changed = false;

				let oldA = obj.getAliases();
				let newA = menu.aliases;
				if(!UTILS.matchAll(oldA, newA))
				{
					let sdata = obj.getStructData();
					changelog += "\n\nAliases changed:";
					changed = true;

					for(let i = 0; i < oldA.length; i++)
					{
						if(!UTILS.containsString(newA, oldA[i]))
						{
							changelog += "\n-Removed: " + oldA[i];
							sdata.delAliasForID(obj.getID(), oldA[i]);
						}
					}

					for(let i = 0; i < newA.length; i++)
					{
						if(!UTILS.containsString(oldA, newA[i]))
						{
							changelog += "\n+Added: " + newA[i];
							sdata.addAliasForID(obj.getID(), newA[i]);
						}
					}

					obj.setAliases(newA);
					overwrite(interaction);
				}

				let oldT = obj.getTitle(true);
				let newT = menu.title;
				if(oldT !== newT)
				{
					changelog += "\n\n+Changed Title: Previously \"" + oldT + "\", now \"" + newT + "\"";
					obj.setTitle(newT);
					changed = true;
				}

				let oldC = obj.getColor(true);
				let newC = menu.color;
				if(oldC !== newC)
				{
					changelog += "\n\n+Changed Color: Previously \"" + String(oldC) + "\", now \"" + String(newC) + "\"";
					obj.setColor(newC);
					changed = true;
				}

				let oldIc = obj.getIconURL(true);
				let newIc = menu.iconURL;
				if(oldIc !== newIc)
				{
					changelog += "\n\n+Changed Icon URL: Previously \"" + String(oldIc) + "\", now \"" + String(newIc) + "\"";
					obj.setIconURL(newIc);
					changed = true;
				}

				let oldIm = obj.getImageURL();
				let newIm = menu.imageURL;
				if(oldIm !== newIm)
				{
					changelog += "\n\n+Changed Image URL: Previously \"" + String(oldIm) + "\", now \"" + String(newIm) + "\"";
					obj.setImageURL(newIm);
					changed = true;
				}

				let oldD = obj.getDesc(true);
				let newD = menu.desc;
				if(oldD !== newD)
				{
					changelog += "\n\nChanged Description to:\n" + String(newD);
					obj.setDesc(newD);
					changed = true;
				}

				let oldP = obj.getParams();
				let newP = menu.params;
				if(!UTILS.deepEqual(oldP, newP))
				{
					changelog += "\n\nParams Changed:";
					changed = true;

					for(let name in oldP)
						if(oldP[name] !== newP[name])
							changelog += "\n+" + UTILS.titleCase(name) + " changed to: " + newP[name];

					obj.setParams(newP);
				}

				let oldF = obj.getFields(true);
				let newF = menu.fields;
				if(!UTILS.deepEqual(oldF, newF))
				{
					changelog += "\n\nFields changed:";
					changed = true;

					for(let i = 0; i < Math.max(oldF.length, newF.length); i++)
					{
						if(!oldF[i] && newF[i])
							changelog += "\n+Added Field " + i + ": " + newF[i].name;
						else if(oldF[i] && !newF[i])
							changelog += "\n-Deleted Field " + i + ": " + oldF[i].name;
						else if(!UTILS.deepEqual(oldF[i], newF[i]))
						{
							changelog += "\nEdited Field " + i;

							if(newF[i].name !== oldF[i].name)
								changelog += " - Field Name changed to: \"" + newF[i].name + "\"";

							if(newF[i].value !== oldF[i].value)
							{
								let diff = newF[i].value.length - oldF[i].value.length;

								if(diff > 0)
									changelog += " - Field Body's Size increased by: " + diff;
								else if(diff < 0)
									changelog += " - Field Body's Size was decreased by: " + (-diff);
								else
									changelog += " - The Field's Body was edited.";
							}
						}
					}

					obj.setFields(newF);
				}

				let oldM = obj.getMeta();
				let newM = menu.meta;
				if(!UTILS.deepEqual(oldM, newM))
				{
					changelog += "\n\nMeta changed:";
					changed = true;

					for(let k in oldM)
					{
						if(!newM[k])
							changelog += "\n-Deleted: \"" + k + "\"";
						else if(oldM[k] !== newM[k])
							changelog += "\nValue of \"" + k + "\" set to: \"" + newM[k] + "\"";
					}

					for(let k in newM)
						if(!oldM[k])
							changelog += "\n+Added: \"" + k + "\" as value: \"" + newM[k] + "\"";
							

					obj.setMeta(newM);
				}

				if(changed)
				{
					obj.save();
					UTILS.msg(interaction.channel, changelog);
				}
			}
			else
			{
				let obj = new StructObj(interaction.guild.id, menu.struct, menu.aliases, menu.author, menu.title, menu.color, menu.iconURL, menu.imageURL, menu.params, menu.fields, menu.meta, menu.desc);
				let outputText = "+Successfully " + (locked ? "queued" : "created") + " " + obj.getStructType() + " \"" + obj.getTitle(true) + "\" with ID: ID" + obj.getID() + "\n\nRegistered commands:";
				let aliases = obj.getAliases();

				for(let i = 0; i < aliases.length; i++)
					outputText += "\n " + obj.getStructData().getPre() + aliases[i];

				UTILS.msg(interaction.channel, outputText);
			}

			delete registerMenus[interaction.member.id];
			interaction.editReply({components: []});
			overwrite(interaction);
		}).catch(console.error);

		return true;
	});

	return registerMenus;
};
