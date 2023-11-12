module.exports = (g) =>
{
	const {UTILS} = g;

	class Player
	{
		id;
		num;
		nicknames;
		dispname;
		channel;
		tags = {};

		constructor(id, num, nicknames, dispname, channel, tags)
		{
			if(typeof id === "object")
			{
				for(let k in id)
					if(!UTILS.isOneOf(k, "effects"))
						this[k] = id[k];
			}
			else
			{
				this.id = id;
				this.num = num;
				this.nicknames = nicknames;
				this.dispname = dispname;
				this.channel = channel;

				if(tags)
					for(let k in tags)
						this.tags[k] = tags[k];
			}
		}

		getInt(tagName, def)
		{
			if(!tagName) return UTILS.print("-ERROR: Missing tagName!");

			let tag = this.tags[tagName.toLowerCase()];
			def = def || 0;

			if(!tag) return def;

			return parseInt(tag, 10);
		}

		setInt(tagName, val)
		{
			if(!tagName) return UTILS.print("-ERROR: Missing tagName!");
			if(!UTILS.isInt(val)) return UTILS.print("-ERROR: '" + val + "' is not an Integer!");

			this.tags[tagName.toLowerCase()] = String(val);
		}

		getNum(tagName, def)
		{
			if(!tagName) return UTILS.print("-ERROR: Missing tagName!");

			let tag = this.tags[tagName.toLowerCase()];
			def = def || 0;

			if(!tag) return def;

			return parseFloat(tag);
		}

		setNum(tagName, val)
		{
			if(!tagName) return UTILS.print("-ERROR: Missing tagName!");
			if(!UTILS.isNum(val)) return UTILS.print("-ERROR: '" + val + "' is not a Number!");

			this.tags[tagName.toLowerCase()] = String(val);
		}

		getBool(tagName, def)
		{
			if(!tagName) return UTILS.print("-ERROR: Missing tagName!");
			def = def || false;

			return UTILS.bool(this.tags[tagName.toLowerCase()], def);
		}

		setBool(tagName, val)
		{
			if(!tagName) return UTILS.print("-ERROR: Missing tagName!");
			if(!val) return UTILS.print("-ERROR: Missing val!");

			this.tags[tagName.toLowerCase()] = String(val);
		}

		isAlive()
		{
			return this.getBool("alive", true);
		}

		has(tagName)
		{
			return this.tags[tagname.toLowerCase()] !== undefined;
		}
	}

	return Player;
};
