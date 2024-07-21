function bitLength(n)
{
    let b = 1;
    
    for(let i = n; i >= 2; i /= 2)
        b++;
    
    return b;
}

function bitsToDec(bits, start, end)
{
	let dec = 0;
	let bit = 0;

	for(let i = end; i >= start; i--)
	{
		dec += Math.pow(2, bit) * (bits[i] ? bits[i] : 0);
		bit++;
	}

	return dec;
}

function cycle(str, n)
{
	let newstr = "";

	Array.from(str).forEach(function(c) {
		let byte = c.charCodeAt(0) + n;

		if(byte > 90)
			byte -= 26;

		newstr = newstr + String.fromCharCode(byte);
	});

	return newstr;
}

function decToBits(bits, num, max)
{
	let b = bitLength(max)-1;
	for(let i = b; i >= 0; i--)
	{
		let n = Math.pow(2, i);
		if(num >= n)
		{
			num -= n;
			bits[b-i] = 1;
		}
		else
			bits[b-i] = 0;
	}
}

module.exports = (g) =>
{
	const {UTILS, SERVER_DATA, CUSTOMDIR, path, fs, EmbedBuilder} = g;

	class StructObj
	{
		#aliases = [];
		#author
		#title;
		#color;
		#iconURL;
		#imageURL;
		#params = {};
		#parent;
		#parentobj;
		#fields = [];
		#meta = {};
		#desc;
		#serverid;
		#struct;
		#id;
		#seed;
		#bits = [];
		#locked;

		constructor(serverid, struct, aliases, author, title, color, iconURL, imageURL, params, fields, meta, desc)
		{
			if(!SERVER_DATA[serverid].structs[struct.toLowerCase()])
				throw "-ERROR: Could not find Structure: " + struct;

			let sdata = SERVER_DATA[serverid].structs[struct.toLowerCase()];

			this.#serverid = serverid;
			this.#struct = struct.toLowerCase();
			this.#parent = sdata.getParent();

			if(typeof aliases === "string")
			{
				let json = JSON.parse(aliases);

				this.#aliases = json.aliases;
				this.#author = json.author;
				this.#title = json.title;
				this.#color = json.color;
				this.#iconURL = json.iconURL;
				this.#imageURL = json.imageURL;
				this.#params = json.params;
				this.#fields = json.fields;
				this.#meta = json.meta;
				this.#desc = json.desc
				this.#id = json.id;
				this.#locked = json.locked;

				this.#seed = author;
			}
			else
			{
				this.#id = sdata.getNextID();

				for(let i = 0; i < aliases.length; i++)
				{
					sdata.addAliasForID(this.#id, aliases[i]);
					this.#aliases[i] = aliases[i];
				}

				this.#author = author;
				this.#title = title;
				this.#color = color;
				this.#iconURL = iconURL;
				this.#imageURL = imageURL;
				this.#params = params;
				this.#fields = fields;
				this.#meta = meta || this.#meta;
				this.#desc = desc;

				if(SERVER_DATA[serverid].locked)
					this.#locked = true;

				this.save();

				if(this.#id === sdata.getMaxID())
					sdata.setNextID();
			}

			if(this.#meta.rand_range)
			{
				let [min, max] = UTILS.split(this.#meta.rand_range, "-");

				if(UTILS.isInt(min) && UTILS.isInt(max))
				{
					min = parseInt(min, 10);
					max = parseInt(max, 10);

					this.#seed = this.#seed || UTILS.randInt(min, max);
					decToBits(this.#bits, this.#seed - Math.min(min, max), Math.max(min, max) - Math.min(min, max));
				}
			}
		}

		getAliases()
		{
			return [...this.#aliases];
		}

		setAliases(a)
		{
			 this.#aliases = a;
		}

		getAuthor()
		{
			return this.#author;
		}

		setAuthor(a)
		{
			this.#author = a;
		}

		getTitle(raw)
		{
			let title = this.#title;
			let rand_title = this.getMeta("rand_title");
			let cycle_title = this.getMeta("cycle_title");
			let rand_fields = this.getMeta("rand_fields");

			if(raw || this.#seed === undefined)
				return title;

			if(rand_title)
			{
				let [bitRange, titleStr] = UTILS.split(rand_title, ":");

				if(!bitRange || !titleStr)
					return title;

				let [min, max] = UTILS.split(bitRange, "-");
				let titleOptions = UTILS.split(titleStr, "/");

				if(!UTILS.isInt(min) || !UTILS.isInt(max, true) || !titleOptions.length === 0)
					return title;

				if(max === undefined) max = min;

				min = parseInt(min, 10);
				max = parseInt(max, 10);

				if(max < min)
				{
					let m = min;
					min = max;
					max = m;
				}

				title = titleOptions[bitsToDec(this.#bits, min, max)] || title;
			}

			if(cycle_title)
			{
				let bitStrs = UTILS.split(cycle_title, ",");
				let bitRanges = [];

				for(let i = 0; i < bitStrs.length; i++)
				{
					let [min, max] = UTILS.split(bitStrs[i], "-");

					if(!UTILS.isInt(min) || !UTILS.isInt(max, true))
						return title;

					if(max === undefined) max = min;

					min = parseInt(min, 10);
					max = parseInt(max, 10);

					if(max < min)
					{
						let m = min;
						min = max;
						max = m;
					}

					bitRanges[i] = [min, max];
				}

				let newTitle = "";

				for(let i = 0; i < title.length; i++)
					newTitle += (bitRanges[i] ? cycle(title[i], bitsToDec(this.#bits, ...bitRanges[i])) : title[i]);

				title = newTitle;
			}

			if(rand_fields)
			{
				let changes = UTILS.split(rand_fields, ";");
				let data = {};

				for(let i = 0; i < changes.length; i++)
				{
					let [key, bitStr, optStr] = UTILS.split(changes[i], ":");

					if(!key || data[key] || !bitStr || !optStr)
						return fields;

					let [min, max] = UTILS.split(bitStr, "-");
					let options = UTILS.split(optStr, "/");

					if(!UTILS.isInt(min) || !UTILS.isInt(max, true))
						return title;

					if(max === undefined) max = min;

					min = parseInt(min, 10);
					max = parseInt(max, 10);

					if(max < min)
					{
						let m = min;
						min = max;
						max = m;
					}

					let choice = bitsToDec(this.#bits, min, max);
					data[key] = options[choice] || "!!!NO TEXT FOUND!!! (" + choice + ")";
				}

				for(let key in data)
					title = title.replace(new RegExp(key, "g"), data[key]);
			}

			return title;
		}

		setTitle(t)
		{
			this.#title = t;
		}

		getColor(raw)
		{
			if(raw)
				return this.#color;

			let c = "808080";

			if(this.#color)
				c = this.#color;
			else if(this.#parent)
			{
				let p = this.getParentObj();

				if(p)
				{
					let pc = p.getColor();

					if(pc)
						c = pc;
				}
			}

			if(c === "random")
				return UTILS.rHex(6);

			return c;
		}

		setColor(c)
		{
			this.#color = c;
		}

		getIconURL(raw)
		{
			if(raw || this.#iconURL)
				return this.#iconURL;
			else if(this.#parent)
			{
				let p = this.getParentObj();
				if(p) return p.getIconURL();
			}
		}

		setIconURL(i)
		{
			this.#iconURL = i;
		}

		getImageURL()
		{
			return this.#imageURL;
		}

		setImageURL(i)
		{
			this.#imageURL = i;
		}

		getParentStruct()
		{
			return this.#parent;
		}

		getParentName()
		{
			if(this.#parent)
				return UTILS.toArgName(this.#params[this.#parent]);
		}

		getParentObj()
		{
			if(!this.#parent)
				return;

			if(this.#parentobj)
				return this.#parentobj;

			let pdata = SERVER_DATA[this.#serverid].structs[this.getParentStruct()];

			if(!pdata)
				return;

			let obj = pdata.getFirstObj(this.getParentName(), this.#locked);
			this.#parentobj = obj;
			return obj;
		}

		getParam(id)
		{
			if(typeof id === "string")
				return this.#params[id];
			else
			{
				return this.#params[this.getStructData().getParam(id)];
			}
		}

		getParams()
		{
			return JSON.parse(JSON.stringify(this.#params));
		}

		setParams(p)
		{
			for(let n in p)
				this.#params[n] = p[n];
		}

		getParamList()
		{
			let sdata = this.getStructData();

			return UTILS.fillArr(this.getParam(sdata.getParam(0)),
								this.getParam(sdata.getParam(1)),
								this.getParam(sdata.getParam(2)),
								this.getParam(sdata.getParam(3)),
								this.getParam(sdata.getParam(4)));
		}

		getParamNames()
		{
			let sdata = this.getStructData();

			return sdata.getParams();
		}

		getFields(raw)
		{
			let fields = [...this.#fields];
			let rand_fields = this.getMeta("rand_fields");

			if(raw)
				return fields;

			for(let i = 0; i < fields.length; i++)
				fields[i].name = fields[i].name.replace(/\*/g, "");

			if(this.#seed === undefined)
				return fields;

			if(rand_fields)
			{
				let changes = UTILS.split(rand_fields, ";");
				let data = {};

				for(let i = 0; i < changes.length; i++)
				{
					let [key, bitStr, optStr] = UTILS.split(changes[i], ":");

					if(!key || data[key] || !bitStr || !optStr)
						return fields;

					let [min, max] = UTILS.split(bitStr, "-");
					let options = UTILS.split(optStr, "/");

					if(max === undefined) max = min;

					min = parseInt(min, 10);
					max = parseInt(max, 10);

					if(max < min)
					{
						let m = min;
						min = max;
						max = m;
					}

					let choice = bitsToDec(this.#bits, min, max);
					data[key] = options[choice] || "!!!NO TEXT FOUND!!! (" + choice + ")";
				}

				for(let i = 0; i < fields.length; i++)
					for(let key in data)
						fields[i].value = fields[i].value.replace(new RegExp(key, "g"), data[key]);
			}

			return fields;
		}

		setFields(f)
		{
			this.#fields = f;
		}

		getMeta(key, def)
		{
			if(key === undefined)
				return JSON.parse(JSON.stringify(this.#meta));

			if(this.#meta[key] === undefined)
				return def;
			else
				return this.#meta[key];
		}

		setMeta(m)
		{
			this.#meta = m;
		}

		hasMeta(key)
		{
			return this.#meta[key] !== undefined;
		}

		getInt(key, def)
		{
			def = def || 0;
			let val = parseInt(this.#meta[key], 10);

			return (val === NaN ? def : val);
		}

		getNum(key, def)
		{
			def = def || 0;
			let val = parseFloat(this.#meta[key]);

			return (isNaN(val) ? def : val);
		}

		getBool(key, def)
		{
			return UTILS.bool(this.#meta[key], def);
		}

		getDesc(raw)
		{
			if(!this.#desc) return null;
			if(raw) return this.#desc;

			let txt = this.#desc;

			if(this.#seed)
				txt = txt.replace(/SEED/g, this.#seed);

			return txt;
		}

		setDesc(d)
		{
			this.#desc = d;
		}

		getID()
		{
			return this.#id;
		}

		getStructType()
		{
			return this.#struct;
		}

		getStructData()
		{
			return SERVER_DATA[this.#serverid].structs[this.#struct];
		}

		embed(source)
		{
			let sdata = SERVER_DATA[this.#serverid].structs[this.#struct];
			let paramKeys = sdata.getParams();
			let e = new EmbedBuilder();

			e.setAuthor({name: this.getTitle(), iconURL: this.getIconURL()});
			e.setColor(this.getColor());
			e.setDescription(this.getDesc());

			for(let i = 0; i < paramKeys.length; i++)
				e.addFields([{name: UTILS.titleCase(paramKeys[i]) + ":", value: this.getParam(paramKeys[i]), inline: true}]);

			e.addFields([{name: "Created by:", value: "<@" + this.getAuthor() + ">", inline: true}]);
			e.setImage(this.getImageURL());

			if(this.#parent)
			{
				let fields = this.getFields();
				let allFields = [...fields];
				let p = this.getParentObj();

				if(p && p.hasMeta("inherit_fields"))
				{
					let inherit = UTILS.libSplit(p.getMeta("inherit_fields"), ";", ":");

					for(let k in inherit)
					{
						let add = true;

						for(let i = 0; i < fields.length; i++)
						{
							if(UTILS.toArgName(fields[i].name).includes(UTILS.toArgName(k)))
							{
								add = false;
								break;
							}
						}

						if(add)
							allFields[allFields.length] = {name: UTILS.titleCase(k) + ":", value: inherit[k] || "!!!NO TEXT FOUND!!!"};
					}
				}

				e.addFields(allFields);
			}
			else
				e.addFields(this.getFields());

			if(this.#locked)
				e.setFooter({text: "This " + this.#struct + " is not yet a part of the game."});

			if(source) UTILS.embed(source, e);
			return e;
		}

		toJSON()
		{
			//Don't know why I can't just return the raw definition directly,
			//but okay. Have a free pointless variable, I guess.
			let json = {
				aliases: this.#aliases,
				author: this.#author,
				title: this.#title,
				color: this.#color,
				iconURL: this.#iconURL,
				imageURL: this.#imageURL,
				params: this.#params,
				fields: this.#fields,
				meta: this.#meta,
				desc: this.#desc,
				id: this.#id,
				locked: this.#locked
			};

			return json;
		}

		save()
		{
			this.#locked = SERVER_DATA[this.#serverid].locked;
			let fname = this.#id + (this.#locked ? " (locked)" : "") + ".json";

			let file = path.join(CUSTOMDIR, this.#serverid, this.#struct, fname);
			fs.writeFileSync(file, JSON.stringify(this));
		}

		isLocked()
		{
			return this.#locked === true;
		}
	}

	return StructObj;
};
