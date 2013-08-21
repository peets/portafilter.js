/* jshint evil: true */ // because we have a method named eval, and jshint doesn't understand it's not the same as global eval.
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

var escapeJSONPointer = function(pointer) {
	return pointer.replace(/~/g, "~0").replace(/\//g, "~1");
};

var unserialize = function(s, exprefix, path) {
	if(!path) {
		path = "";
	}
	if(s instanceof Array) {
		if(s.length === 0 || s[0] !== exprefix) {
			var ret = new Node(path ? path : "/", []);
			for(var i = 0; i < s.length; i++) {
				ret.value[i] = unserialize(s[i], exprefix, path + "/" + i);
				ret.value[i].parent = ret;
			}
			return ret;
		} else {
			if(s.length == 1) {
				throw new Error("E029 malformed expression at " + path);
			}
			var err;
			switch(s[1]) {
				case "f":
					// arg names can be any expression; it's evaluated the first time the function definition is encountered by eval.
					// that's when we'll check that it's an array and that names don't conflict.
					if(s.length != 4) {
						throw new Error("E031 malformed function definition at " + path + "; proper form is [exprefix, \"f\", arguments, body]");
					}
					var ret = new Node(path ? path : "/", new Func(path ? path : "/", unserialize(s[2], exprefix, path + "/" + 2), unserialize(s[3], exprefix, path + "/" + 3)));
					ret.value.args.parent = ret.value.body.parent = ret;
					return ret;
				case "~":
					if(s.length != 3) {
						throw new Error("E032 malformed name resolution at " + path + "; proper form is [exprefix, \"~\", name]");
					}
					var ret = new Node(path ? path : "/", new Op(s[1], [unserialize(s[2], exprefix, path + "/" + 2)]));
					ret.value.args[0].parent = ret;
					return ret;
				case "`":
					err = "E033 malformed function call at " + path + "; proper form is [exprefix, \"`\", function, arguments]";
				/* jshint -W086 */ // jshint doesn't like it when we fallthrough to the next case
				case "given":
					if(!err) {
						err = "E034 malformed name binding at " + path + "; proper form is [exprefix, \"given\", object, expression]";
					}
				case ".":
				/* jshint +W086 */
					if(s.length != 4) {
						if(!err) {
							err = "E035 malformed member selection at " + path + "; proper form is [exprefix, \".\", object, name]";
						}
						throw new Error(err);
					}
					var ret = new Node(path ? path : "/", new Op(s[1], [unserialize(s[2], exprefix, path + "/" + 2), unserialize(s[3], exprefix, path + "/" + 3)]));
					ret.value.args[0].parent = ret.value.args[1].parent = ret;
					return ret;
				default:
					throw new Error("E030 malformed expression at " + path);
			}
		}
	} else if(s === null || typeof s === "number" || typeof s === "string" || typeof s === "boolean") {
		return new Node(path ? path : "/", s);
	} else if(typeof s === "object") {
		var ret = new Node(path ? path : "/", {});
		for(var k in s) {
			if(s.hasOwnProperty(k)) {
				ret.value[k] = unserialize(s[k], exprefix, path + "/" + escapeJSONPointer(k));
				ret.value[k].parent = ret;
			}
		}
		return ret;
	} else {
		throw new Error("E028 cannot unserialize a " + typeof s);
	}
};

Func.prototype.serialize = function(exprefix) {
	return [exprefix, "f", this.args.serialize(exprefix), (this.body ? this.body.serialize(exprefix) : this.name)];
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
				return [exprefix, "~", this.value.args[0].serialize(exprefix)];
			case "given":
			case ".":
			case "`":
				if(this.value.args.length != 2) {
					throw new Error("E013 BUG: " + this.value + " is '" + this.value.op + "' but doesn't have exactly two args");
				}
				return [exprefix, this.value.op, this.value.args[0].serialize(exprefix), this.value.args[1].serialize(exprefix)];
			default:
				throw new Error("E012 BUG: " + this.value + " has a bad op type");
		}
	}
	if(this.value instanceof Func) {
		return this.value.serialize(exprefix);
	}
	if(this.value instanceof Object) {
		var ret = {};
		for(var k in this.value) {
			ret[k] = this.value[k].serialize(exprefix);
		}
		return ret;
	}
	throw new Error("E011 BUG: " + this + "'s value isn't an Array, Op, or Object. What can it be?");
};

Node.prototype.resolve = function(name, globals, args) {
	for(var cur = this; cur; cur = cur.parent) {
		if(cur.value instanceof Array) {
			var ok = false;
			if(typeof key === "string" && key.match(/^\d+$/)) {
				key = parseInt(key, 10);
				ok = true;
			} else if(typeof key === "number" && key % 1 === 0) {
				ok = true;
			}
			if(ok && key >= 0 && key < cur.value.length) {
				return cur.value[key].eval(globals, args);
			}
		} else if(cur.value instanceof Op) {
			if(cur.value.op == "given") {
				var bindings = cur.value.args[0].eval(globals, args);
				var v = bindings[name];
				if(typeof v !== "undefined") {
					return v;
				}
			}
		} else {
			var v = cur.value[name];
			if(typeof v !== "undefined") {
				return v.eval(globals, args);
			}
		}
		if(cur.f) {
			// function body root -> check if argument matches
			var argNames = cur.f.args.evald;
			for(var i = 0; i < argNames.length; i++) {
				if(argNames[i] == name) {
					if(i < args.length) {
						return args[i];
					} else {
						throw new Error("E025", util.format("argument %s was not provided when function %s was called", name, cur.f.name));
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
	}
	var v = globals[name];
	if(typeof v !== "undefined") {
		return v;
	}
	throw new Error(util.format("E024 name resolution error at %s: nothing named '%s' exists in scope.", this.path, name));
};

Node.prototype.select = function(collection, key) {
	if(collection instanceof Array) {
		var ok = false;
		if(typeof key === "string" && key.match(/^\d$/)) {
			key = parseInt(key, 10);
			ok = true;
		} else if(typeof key === "number" && key % 1 === 0) {
			ok = true;
		}
		if(ok && key >= 0 && key < collection.length) {
			return collection[key];
		}
		throw new Error(util.format("E026 member selection error at %s: array %j has no element at index %s", this.path, collection, key));
	}
	var r = collection[key];
	if(typeof collection !== "undefined") {
		return r;
	}
	throw new Error(util.format("E027 member selection error at %s: object %j has no property named %s", this.path, collection, key));
};

Node.prototype.eval = function(globals, args) {
	if(typeof this.evald === "undefined") {
		if(this.evaling) {
			throw new Error("E019 dependency loop at " + this.path);
		}
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
					this.evald = this.value.args[1].eval(globals, args); // we didn't forget about the bindings; resolve will examine args[0] if / when the time comes.
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
						throw new Error(util.format("E022 function call error at %s: that's not a function! (It's %j)", this.value.args[0].path, func));
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
module.exports.unserialize = unserialize;
