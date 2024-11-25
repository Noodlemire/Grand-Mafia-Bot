const CONTENT_LIMIT = 1950
let msg = "";
let diff = false;

module.exports = (g) =>
{
	const {bot, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, menus, interactions, fs, path} = g;
	const UTILS = {};

	UTILS.arrayByBraces = (a) =>
	{
		let cur = undefined;
		let deep = 0;

		for(let i = a.length-1; i >= 0; i--)
		{
			let numCl = UTILS.countChar(a[i], "}");
			let numOp = UTILS.countChar(a[i], "{");

			if(numCl > numOp || deep > 0)
				cur = a[i] + (cur ? ' ' + cur : '');

			deep = Math.max(deep + (numCl - numOp), 0);

			if(deep === 0 && cur)
			{
				a[i] = cur;
				cur = undefined;
			}
			else if(deep > 0)
				a.splice(i, 1);
		}
	}

	UTILS.arrayToChecklist = (a) =>
	{
		let c = {};

		for(let i = 0; i < a.length; i++)
			c[a[i]] = true;

		return c;
	}

	UTILS.bool = (str, def) =>
	{
		if(typeof str === "boolean")
			return str;

		let s = str ? str.toLowerCase() : "";

		if(UTILS.isOneOf(s, "true", "t", "yes", "y"))
			return true;
		else if(UTILS.isOneOf(s, "false", "f", "no", "n"))
			return false;
		else
			return def;
	}

	UTILS.cloneClass = (obj, ...args) =>
	{
		let cls = obj.constructor;
		return new cls(JSON.parse(JSON.stringify(obj)), ...args);
	}

	UTILS.containsString = (t, s) =>
	{
		if(!t || !s)
			return false;

		for(let i in t)
			if(String(t[i]).toLowerCase() === String(s).toLowerCase())
				return true;

		return false;
	}

	UTILS.count = (...objs) =>
	{
		let c = 0;

		for(let i = 0; i < objs.length; i++)
			if(objs[i])
				c++;

		return c;
	}

	UTILS.countChar = (str, ch) =>
	{
		let c = 0;

		for(let i = 0; i < str.length; i++)
			if(str[i] === ch)
				c++;

		return c;
	}

	UTILS.deepEqual = (x, y) =>
	{
		const ok = Object.keys, tx = typeof x, ty = typeof y;
		return x && y && tx === 'object' && tx === ty ?
		(
			ok(x).length === ok(y).length &&
			ok(x).every(key => UTILS.deepEqual(x[key], y[key]))
		) : (x === y);
	}

	UTILS.display = (value, level) =>
	{
		level = level || 0;

		if(level > 5) return "...";

		switch(typeof value)
		{
			case "string":
				return '"' + value + '"';

			case "object":
				if(!value)
					return "null";
				else if(Array.isArray(value))
				{
					if(value.length === 0)
						return "[]";

					let disp = "[" + UTILS.display(value[0], level);

					for(let i = 1; i < value.length; i++)
						disp = disp + ", " + UTILS.display(value[i], level);

					return disp + "]";
				}
				else
				{
					let keys = Object.keys(value);

					if(keys.length === 0)
						return "{}";

					let disp = "{\n" + UTILS.tabLevel(level+1) + UTILS.display(keys[0]) + ": " + UTILS.display(value[keys[0]], level+1);

					for(let i = 1; i < keys.length; i++)
						disp = disp + ",\n" + UTILS.tabLevel(level+1) + UTILS.display(keys[i]) + ": " + UTILS.display(value[keys[i]], level+1);

					return disp + "\n" + UTILS.tabLevel(level) + "}";
				}

			default:
				return String(value);
		}
	}

	UTILS.embed = (s, e_) =>
	{
		let e = e_.data;
		let auth = (e.author ? e.author.name : "");
		let sum = auth.length;
		let embeds = [e_];
		let pages = [{fields: [], sum: 0}];
		let curPage = 0;
		let sumPage = 0;

		if(!s.deferred && !s.reply && !s.send)
		{
			s.returned = auth !== "" ? auth : e.description;
			return;
		}

		if(auth.length > 256) {UTILS.msg(s, "-ERROR: Embed Title \"" + auth + "\" is longer than 256 characters!"); return;}

		if(e.description)
		{
			if(e.description.length > 4096) {UTILS.msg(s, "-ERROR: Embed \"" + auth + "\"'s Description is longer than 4096 characters!"); return;}
			sum += e.description.length;
		}

		if(e.footer)
		{
			if(e.footer.text.length > 2048) {UTILS.msg(s, "-ERROR: Embed \"" + auth + "\"'s Footer text is longer than 2048 characters!"); return;}
			sum += e.footer.text.length;
		}

		if(auth.length + (e.description ? e.description.length : 0) + (e.footer ? e.footer.text.length : 0) > 4700) {UTILS.msg(s, "-ERROR: Embed \"" + auth + "\"'s Title, Description, and/or Footer are too long! They must allow for at least one full Field (Sum <= 4700)"); return;}

		for(let f in e.fields)
		{
			if(e.fields[f].name.length > 256) {UTILS.msg(s, "-ERROR: Embed \"" + auth + "\"'s Field " + f + " contains a Name which is longer than 256 characters!"); return;}
			if(e.fields[f].value.length > 1024) {UTILS.msg(s, "-ERROR: Embed \"" + auth + "\"'s Field " + f + " contains a Value which is longer than 1024 characters!"); return;}

			let page = pages[curPage];

			if(page.fields.length >= 25 || sum + page.sum + e.fields[f].name.length + e.fields[f].value.length > 6000)
			{
				sumPage += page.fields.length;
				curPage++;
				pages[curPage] = {fields: [e.fields[f]], sum: e.fields[f].name.length + e.fields[f].value.length}
			}
			else
			{
				page.fields[f - sumPage] = e.fields[f];
				page.sum += e.fields[f].name.length + e.fields[f].value.length;
			}
		}

		if(pages.length > 1)
		{
			e_.setFields(pages[0].fields);
			embeds[1] = new EmbedBuilder();
			embeds[1].setColor(e.color);
			embeds[1].setDescription("Page 1 of " + pages.length);
		}

		let buttons = null; 

		if(pages.length > 1)
		{
			buttons = new ActionRowBuilder({components: [
				new ButtonBuilder({customId: "__utils:frst", style: ButtonStyle.Primary, label: "First Page", emoji: "⏪", disabled: true}),
				new ButtonBuilder({customId: "__utils:prev", style: ButtonStyle.Secondary, label: "Previous Page", emoji: "⬅️", disabled: true}),
				new ButtonBuilder({customId: "__utils:next", style: ButtonStyle.Secondary, label: "Next Page", emoji: "➡️"}),
				new ButtonBuilder({customId: "__utils:last", style: ButtonStyle.Primary, label: "Last Page", emoji: "⏩"}),
			]});

			if(pages.length === 2)
				buttons.components[3].setDisabled(true);
		}

		let eObj = {embeds, components: (buttons ? [buttons] : null), allowedMentions: {repliedUser: false}, fetchReply: true};

		let cb = (sent) =>
		{
			if(pages.length > 1)
			{
				menus[sent.id] = {type: "embed", message: sent, page: 1, buttons, list: [pages[0].fields], time: new Date().getTime()};

				for(let i = 1; i < pages.length; i++)
					menus[sent.id].list[i] = pages[i].fields;
			}
		};

		let sfunc = s.deferred ? "editReply" : "reply";
		if(!s[sfunc]) sfunc = "send";

		return s[sfunc](eObj).catch(console.error).then(cb);
	}

	UTILS.error = (source, e) =>
	{
		console.error(e);
		UTILS.msg(source, e);
	}

	UTILS.fillArr = (...vals) =>
	{
		let arr = [];

		for(let i = 0; i < vals.length; i++)
			if(vals[i] !== undefined)
				arr[arr.length] = vals[i];

		return arr;
	}

	UTILS.findFirstChar = (str, ch) =>
	{
		for(let i = 0; i < str.length; i++)
			if(str[i] === ch)
				return i;
	}

	UTILS.findLastCharAfter = (str, ch, start) =>
	{
		for(let i = start-1; i >= 0; i--)
			if(str[i] === ch)
				return i;
	}

	UTILS.findClosingCharFor = (str, ch, target, start) =>
	{
		let nested = 0;

		for(let i = start+1; i < str.length; i++)
		{
			if(str[i] === ch)
				nested++;
			else if(str[i] === target)
			{
				if(nested > 0)
					nested--;
				else
					return i;
			}
		}
	}

	UTILS.firstEmpty = (arr) =>
	{
		for(let i = 0; i < arr.length; i++)
			if(arr[i] === undefined)
				return i;

		return arr.length;
	},

	UTILS.gate = (min, value, max) =>
	{
		if(min > max)
		{
			let temp = min;
			min = max;
			max = temp;
		}

		if(min >= value)
			return min;
		else if(max <= value)
			return max;
		else
			return value;
	}

	UTILS.getActiveBody = (bodyinfo) =>
	{
		if(!bodyinfo) return;

		for(let i = 0; i < bodyinfo.length; i++)
		{
			if(typeof bodyinfo[i] === "object" && !bodyinfo[i].ended)
			{
				let nested = UTILS.getActiveBody(bodyinfo[i].commands);

				if(nested)
					return nested;
				else
					return bodyinfo[i];
			}
		}
	}

	UTILS.getPlayerByID = (players, id) =>
	{
		if(!id) return;

		for(let i = 0; i < players.length; i++)
			if(players[i].id === id)
				return players[i]
	}

	UTILS.getPlayerByName = (players, name) =>
	{
		if(!name) return;

		name = name.toLowerCase();

		for(let a = 0; a < players.length; a++)
		{
			if(players[a].dispname && players[a].dispname.toLowerCase() === name)
				return players[a];

			for(let b = 0; b < players[a].nicknames.length; b++)
				if(players[a].nicknames[b] === name)
					return players[a];
		}
	}

	UTILS.isInt = (v, trueIfNull) =>
	{
		if(!v && trueIfNull)
			return true;

		if(typeof v !== "string")
			v = String(v);

		return parseInt(v, 10).toString() === v;
	}

	UTILS.isLong = (v, trueIfNull) =>
	{
		if(!v && trueIfNull)
			return true;

		if(typeof v !== "string")
			v = String(v);

		for(let i = 0; i < v.length; i++)
			if(!UTILS.isInt(v[i]))
				return false;

		return true;
	}

	UTILS.isOneOf = (val, ...vals) =>
	{
		for(let i = 0; i < vals.length; i++)
			if(val === vals[i])
				return true;

		return false;
	}

	UTILS.isNeg = (arg) =>
	{
		if(typeof arg !== "string" || arg.length === 0)
			return false;

		return arg.charAt(0) === "-" || arg.charAt(0) === "!";
	}

	UTILS.isNum = (v, trueIfNull) =>
	{
		if(!v && trueIfNull)
			return true;

		if(typeof v !== "string")
			v = String(v);

		return parseFloat(v).toString() === v;
	}

	UTILS.isURL = (str) =>
	{
		let url = undefined;

		try
		{
			url = new URL(str);
		}
		catch (e)
		{
			return false;  
		}

		return url.protocol === "http:" || url.protocol === "https:";
	}

	UTILS.isVar = (str) =>
	{
		return str && str.indexOf("{") !== -1 && str.indexOf("{") < str.indexOf("}");
	}

	UTILS.inherit = (data, source, callback) =>
	{
		if(data[source.guild.id].inherit)
		{
			bot.guilds.fetch(data[source.guild.id].inherit).catch(console.error).then((guild) =>
			{
				if(guild && guild.id)
				{
					if(data[guild.id])
						return callback(data[guild.id]);
					else
						UTILS.msg(source, "-Error: Currently inheriting from a server with no available data.");
				}
				else
					UTILS.msg(source, "-Error: Cannot inherit from ID '" + source.guild.id + "' as this server is no longer available.");
			});
		}
		else
			return callback(data[source.guild.id]);
	}

	UTILS.libSplit = (s, d1, d2) =>
	{
		if(!s) return {};

		let splits1 = UTILS.split(s, d1);
		let lib = {};

		for(let i = 0; i < splits1.length; i++)
		{
			let splits2 = splits1[i].split(d2);
			let k = String(splits2[0]).trim();

			lib[k] = splits2[1] || "";

			for(let n = 2; n < splits2.length; n++)
				lib[k] += d2 + (splits2[n] || "");

			lib[k] = lib[k].trim();
		}

		return lib;
	}

	UTILS.matchAll = (a, b) =>
	{
		for(let x = 0; x < a.length; x++)
		{
			let matched = false;

			for(let y = 0; y < b.length; y++)
			{
				if(a[x] === b[y])
				{
					matched = true;
					break;
				}
			}

			if(!matched)
				return false;
		}

		for(let y = 0; y < b.length; y++)
		{
			let matched = false;

			for(let x = 0; x < a.length; x++)
			{
				if(a[x] === b[y])
				{
					matched = true;
					break;
				}
			}

			if(!matched)
				return false;
		}

		return true;
	}

	UTILS.matchOne = (a, b) =>
	{
		for(let x = 0; x < a.length; x++)
			for(let y = 0; y < b.length; y++)
				if(a[x] === b[y])
					return true;

		return false;
	}

	UTILS.msg = (src, txt, nodiff, line, menu) =>
	{
		txt = String(txt);

		if(!src.deferred && !src.reply && !src.send)
		{
			src.returned = txt;
			return {then: (cb) => {if(cb) return cb();}};
		}

		let size = CONTENT_LIMIT;
		line = (line || 0);

		if(line + size < txt.length)
			while(txt[line+size-1] && txt[line+size-1] != '\n')
				size--;

		if(size <= 0)
			size = CONTENT_LIMIT;

		let t = txt.substring(line, line + size);
		let message = (nodiff && t || "```diff\n" + t + "```");

		if(!menu)
		{
			if(line + t.length < txt.length)
			{
				let buttons = new ActionRowBuilder({components: [
					new ButtonBuilder({customId: "__utils:frst", style: ButtonStyle.Primary, label: "First Page", emoji: "⏪", disabled: true}),
					new ButtonBuilder({customId: "__utils:prev", style: ButtonStyle.Secondary, label: "Previous Page", emoji: "⬅️", disabled: true}),
					new ButtonBuilder({customId: "__utils:next", style: ButtonStyle.Secondary, label: "Next Page", emoji: "➡️"}),
					new ButtonBuilder({customId: "__utils:last", style: ButtonStyle.Primary, label: "Last Page", emoji: "⏩"}),
				]});

				if(line + t.length + CONTENT_LIMIT >= txt.length)
					buttons.components[3].setDisabled(true);

				menu = {type: "text", buttons, page: 1, list: [message], time: new Date().getTime()};
				return UTILS.msg(src, txt, nodiff, line + size, menu);
			}
			else
			{
				let msgObj = {content: message, allowedMentions: {repliedUser: false}, fetchReply: true};

				if(src.deferred)
					return src.editReply(msgObj).catch(console.error);
				else if(src.reply)
					return src.reply(msgObj).catch(console.error);
				else
					return src.send(msgObj).catch(console.error);
			}
		}
		else
		{
			menu.list[menu.list.length] = message;

			if(line + t.length < txt.length)
				return UTILS.msg(src, txt, nodiff, line + size, menu);
			else
			{
				let sfunc = src.deferred ? "editReply" : "reply";
				if(!src[sfunc]) sfunc = "send";

				return src[sfunc]({content: menu.list[0] + "\nPage 1 of " + menu.list.length, components: [menu.buttons], allowedMentions: {repliedUser: false}, fetchReply: true}).catch(console.error).then((sent) =>
				{
					menu.message = sent;
					menus[sent.id] = menu;
				});
			}
		}
	}

	UTILS.print = (source, str, nextDiff) =>
	{
		let curDiff = source.print ? source.print.diff : diff;

		if(nextDiff && !curDiff) str = "```diff\n" + str;
		if(!nextDiff && curDiff) str = "\n```" + str;

		if(str)
		{
			if(source.print)
			{
				source.print.txt += String(str) + "\n";
				source.print.diff = nextDiff;
			}
			else
			{
				msg += String(str) + "\n";
				diff = nextDiff;
			}
		}
	}

	UTILS.printReturn = () =>
	{
		let m = msg;
		if(diff) m += "\n```"

		msg = "";
		diff = false;

		return m;
	}

	//Object: {<Object: {rate}>, etc...}
	UTILS.randChances = (t) =>
	{
		let sum = 0;

		for(let i in t)
			sum = sum + Math.max(Math.round(100 * t[i].rate), 0);

		let choice = UTILS.randInt(sum);
		sum = 0;

		for(let i in t)
		{
			sum = sum + Math.max(Math.round(100 * t[i].rate), 0);

			if(sum > choice)
				return t[i];
		}

		console.log("Warning: randChances returned null! Sum: " + sum + ", Choice: " + choice);
	}

	UTILS.randElem = (arr) =>
	{
		if(arr.length === 0)
			return null;

		return arr[UTILS.randInt(arr.length)];
	}

	//[<min>, <max>] or [0, <max>) or [0, 2)
	UTILS.randInt = (min, max) =>
	{
		if(min === undefined)
		{
			min = 1;
			max = max === undefined ? max : 2;
		}

		if(max === undefined)
		{
			max = min - 1;
			min = 0;
		}

		if(max < min)
		{
			let n = min;
			min = max;
			max = n;
		}

		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	UTILS.registerInteraction = (name, func) =>
	{
		if(interactions[name])
			throw "Error: Duplicate Interaction Custom ID: " + name;

		interactions[name] = func;
	}

	UTILS.rHex = (n) =>
	{
		if(n)
		{
			let output = "";

			for(let i = 0; i < n; i++)
				output = output + UTILS.rHex();

			return output;
		}

		let h = Math.floor(Math.random() * 16);

		if(h >= 10)
			return String.fromCharCode(55 + h);
		else
			return String(h);
	}

	UTILS.split = (str, d, allowEmpty) =>
	{
		let splits = String(str || "").split(d);

		if(!allowEmpty)
			for(let i = splits.length-1; i >= 0; i--)
				if(splits[i].length === 0)
					splits.splice(i, 1);

		return splits;
	}

	UTILS.tabLevel = (level) =>
	{
		let tabs = "";

		for(let i = 0; i < level; i++)
			tabs = tabs + '\t';

		return tabs;
	}

	UTILS.titleCase = (str) =>
	{
		str = String(str);
		let output = "";

		for(let i = 0; i < str.length; i++)
		{
			if(str[i] === "_")
				output += " ";
			else if(output[i-1] === " " || !output[i-1])
				output += str[i].toUpperCase();
			else
				output += str[i].toLowerCase();
		}

		return output;
	}

	UTILS.toArgName = (str, extended) =>
	{
		if(str instanceof Array)
		{
			let argArr = [];

			for(let i = 0; i < str.length; i++)
				argArr[i] = UTILS.toArgName(str[i]);

			return argArr;
		}
		else
		{
			let output = String(str).trim().toLowerCase().replace(/ /g, "_");

			//Replaces anything NOT alphanumeric, underscore, or dash with nothingness
			if(extended) output = output.replace(/[^\w_\-]/g, "");

			return output;
		}
	}

	UTILS.trimFormatting = (str) =>
	{
		let f = ["\*", "_", "`", "~"];
		str = str.trim();

		for(let i = 0; i < f.length; i++)
		{
		    let limit = 0;
		    
		    for(let n = str.length-1; n >= 0; n--)
			{
				if(str[n] === f[i])
					limit++;
				else
					break;
			}
			
			let limitMax = limit;

			if(limit > 0)
				for(let n = 0; n < str.length-limitMax; n++)
					if(str[n] === f[i])
						limit--;

			if(limit > 0)
				return UTILS.trimFormatting(str.substring(0, str.length-limit));
			else if(limitMax > 0)
				return UTILS.trimFormatting(str.substring(0, str.length-limitMax)) + f[i].repeat(limitMax);
		}

		return str;
	}

	UTILS.verifyDir = (...dirs) =>
	{
		for(let a = 0; a < dirs.length; a++)
		{
			let d = [];

			for(let b = 0; b <= a; b++)
				d[b] = dirs[b];

			let dpath = path.join(...d);

			if(!fs.existsSync(dpath))
				fs.mkdirSync(dpath);
		}
	}

	function updateMenu(interaction, pageChange)
	{
		let menu = menus[interaction.message.id];

		if(menu.type === "embed" && (!menu.message.embeds[0] || !menu.message.embeds[1]))
		{
			delete menus[interaction.message.id];
			return;
		}

		menu.page = UTILS.gate(1, pageChange(menu), menu.list.length);

		menu.buttons.components[0].setDisabled(menu.page <= 2);
		menu.buttons.components[1].setDisabled(menu.page <= 1);
		menu.buttons.components[2].setDisabled(menu.page >= menu.list.length);
		menu.buttons.components[3].setDisabled(menu.page >= menu.list.length-1);

		if(menu.type === "text")
			interaction.update({components: [menu.buttons], content: menu.list[menu.page-1] + "\nPage " + menu.page + " of " + menu.list.length}).catch(console.error);
		else
		{
			let embeds = [new EmbedBuilder(menu.message.embeds[0]), new EmbedBuilder(menu.message.embeds[1])];

			embeds[0].setFields(menu.message.embeds[0].fields = menu.list[menu.page-1]);
			embeds[1].setDescription(menu.message.embeds[1].description = "Page " + menu.page + " of " + menu.list.length);
			interaction.update({components: [menu.buttons], embeds}).catch(console.error);
		}

		menu.time = new Date().getTime();
	}

	UTILS.registerInteraction("__utils:frst", (interaction) =>
	{
		if(menus[interaction.message.id])
			updateMenu(interaction, (m) => {return 1;});

		return true;
	});

	UTILS.registerInteraction("__utils:prev", (interaction) =>
	{
		if(menus[interaction.message.id])
			updateMenu(interaction, (m) => {return m.page - 1;});

		return true;
	});

	UTILS.registerInteraction("__utils:next", (interaction) =>
	{
		if(menus[interaction.message.id])
			updateMenu(interaction, (m) => {return m.page + 1;});

		return true;
	});

	UTILS.registerInteraction("__utils:last", (interaction) =>
	{
		if(menus[interaction.message.id])
			updateMenu(interaction, (m) => {return m.list.length;});

		return true;
	});

	UTILS.verifyPlayerData = (data, archive) =>
	{
		for(let key in archive)
			if((typeof archive[key] === "function" || UTILS.isOneOf(key, "id", "num", "nicknames", "dispname"))
					&& !UTILS.deepEqual(data[key], archive[key]))
				return key;
	}

	return UTILS;
}
