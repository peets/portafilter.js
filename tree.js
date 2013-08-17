var util = require('util');

var Op = function(op, args) {
	this.op = op;
	this.args = args;
};

var Node = function(path, val) {
	this.path = path;
	if(val === null || typeof val === "boolean" || typeof val === "string" || typeof val === "number") {
		this.evald = val;
	} else {
		this.value = val;
	}
	this.evaling = false;
};

var Func = function(name, argNames, body) {
	this.name = name;
	this.args = argNames;
	if(typeof body == "function") {
		this.hard = body;
	} else {
		this.body = body;
	}
};

Node.prototype.serialize = function(exprefix) {
	if(typeof this.value === 'undefined') {
		if(typeof this.evald === 'undefined') {
			throw new Error("E010 BUG: " + this + " doesn't have value nor evald!");
		}
		return this.evald;
	}
	if(this.value instanceof Array) {
		var ret = [];
		for(var i = 0; i < this.value.length; i++) {
			ret[i] = this.value[i].serialize(exprefix);
		}
		return ret;
	}
	if(this.value instanceof Op) {
		switch(this.value.op) {
			case "~":
				if(this.value.args.length != 1) {
					throw new Error("E014 BUG: " + this.value + " is '~' but doesn't have exactly one arg (args is " + this.value.args.serialize("X") + ")");
				}
				return [exprefix, "~", this.value.args[0].serialize(exprefix)]
			case "given":
			case ".":
			case "`":
			case "f":
				if(this.value.args.length != 2) {
					throw new Error("E013 BUG: " + this.value + " is '" + this.value.op + "' but doesn't have exactly two args");
				}
				return [exprefix, this.value.op, this.value.args[0].serialize(exprefix), this.value.args[1].serialize(exprefix)];
			default:
				throw new Error("E012 BUG: " + this.value + " has a bad op type");
		}
	}
	if(this.value instanceof Object) {
		var ret = {};
		for(k in this.value) {
			ret[k] = this.value[k].serialize(exprefix);
		}
		return ret;
	}
	throw new Error("E011 BUG: " + this + "'s value isn't an Array, Op, or Object. What can it be?");
};

Node.prototype.resolve = function(name, globals, args) {
	for(var cur = this; cur; cur = cur.parent) {
		// object, array, given, function body root (gulp!)
		if(cur.value instanceof Array) {
			var n = Number(name);
			if(n != NaN && n > 0 && n < cur.value.length) {
				return cur.value[n].eval(globals, args);
			}
		} else if(cur.value instanceof Op) {
			if(cur.value.op == "given") {
				var bindings = cur.value.args[0].eval(globals, args);
				var v = bindings[name];
				if(typeof v !== "undefined") {
					return v.eval(globals, args);
				}
			}
		} else if(cur.f) {
			// function body root -> check if argument matches
			var f = cur.f.eval(globals, args);
			for(var i = 0; i < f.args.length; i++) {
				if(f.args[i] == name) {
					if(i < args.length) {
						return args[i];
					} else {
						throw new Error("E025", util.format("argument %s was not provided when function %s was called", name, f.name));
						// to avoid this error, supply all arguments or provide default argument values like so:
						//
						//     f(a, b, c) {
						//         let(c = exists("c") ? c : 0)
						//         a * b + c
						//     }
						//
						// The let-binding will resolve before the arguments are checked, therefore this error won't be triggered.
					}
				}
			}
		}
		var v = cur.value[name];
		if(typeof v !== "undefined") {
			return v.eval(globals, args);
		}
	}
	var v = globals[name];
	if(typeof v !== "undefined") {
		return v;
	}
	throw new Error(util.format("E024 name resolution error at %s: nothing named '%s' exists in scope.", this.path, name));
}

Node.prototype.select = function(collection, key) {
	if(collection instanceof Array) {
		var n = Number(key);
		if(n != NaN && n > 0 && n < collection.length) {
			return collection[n];
		}
		throw new Error(util.format("E022 member selection error at %s: array %j has no element at index %s", this.path, collection, key));
	}
	var r = collection[key];
	if(typeof collection !== "undefined") {
		return r;
	}
	throw new Error(util.format("E023 member selection error at %s: object %j has no property named %s", this.path, collection, key));
};

Node.prototype.eval = function(globals, args) {
	if(this.evaling) {
		throw new Error("E019 dependency loop at " + this.path);
	}
	if(typeof this.evald === "undefined") {
		this.evaling = true;
		if(this.value instanceof Array) {
			this.evald = [];
			for(var i = 0; i < this.value.length; i++) {
				this.evald[i] = this.value[i].eval(globals, args);
			}
		} else if(this.value instanceof Func) {
			this.value.args.eval(globals, args);
			this.evald = this.value;
		} else if(this.value instanceof Op) {
			switch(this.value.op) {
				case "given":
					this.evald = this.args[1].eval(globals, args); // we didn't forget about the bindings; resolve will examine args[0] if / when the time comes.
					break;
				case "~":
					var name = this.value.args[0].eval(globals, args);
					if(typeof name !== "string") {
						throw new Error(util.format("E020 name resolution error at %s: name expression must result in a string", this.value.args[0].path));
					}
					this.evald = this.resolve(name, globals, args);
					break;
				case ".":
					var collection = this.value.args[0].eval(globals, args);
					var name = this.value.args[1].eval(globals, args);
					if(typeof name !== "string") {
						throw new Error(util.format("E021 member selection error at %s: name expression must result in a string", this.value.args[1].path));
					}
					this.evald = this.select(collection, name);
					break;
				case "`":
					var func = this.value.args[0].eval(globals, args);
					if(!(func instanceof Func)) {
						throw new Error(util.format("E022 function call error at %s: that's not a function!", this.value.args[0].path));
					}
					var ourArgs = this.value.args[1].eval(globals, args);
					if(!(ourArgs instanceof Array)) {
						throw new Error(util.format("E023 function call error at %s: argument expression must result in an array.", this.value.args[1].path));
					}
					if(typeof func.hard === "function") {
						this.evald = func.hard(ourArgs);
					} else {
						this.evald = func.body.eval(globals, ourArgs);
					}
					break;
			}
		} else if(this.value instanceof Object) {
			this.evald = {};
			for(var k in this.value) {
				this.evald[k] = this.value[k].eval(globals, args);
			}
		} else {
			throw new Error("E021 BUG: " + this + "'s value isn't an Array, Op, or Object. What can it be?");
		}
		this.evaling = false;
	}
	return this.evald;
};

module.exports.Op = Op;
module.exports.Node = Node;
module.exports.Func = Func;
