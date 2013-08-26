var util = require('util');

var Op = function(op, args) {
	this.op = op;
	this.args = args;
};

function nodeConstructorClosure() {
	var id = 0;
	return function(path, val) {
		this.path = path;
		this.value = val;
		this.id = ++id;
	};
}
var Node = nodeConstructorClosure();

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
				case "~":
					if(s.length != 3) {
						throw new Error("E032 malformed name resolution at " + path + "; proper form is [exprefix, \"~\", name]");
					}
					var ret = new Node(path ? path : "/", new Op(s[1], [unserialize(s[2], exprefix, path + "/" + 2)]));
					ret.value.args[0].parent = ret;
					return ret;
				case "f":
					err = "E031 malformed function definition at " + path + "; proper form is [exprefix, \"f\", arguments, body]";
				/* jshint -W086 */ // linter doesn't like it when we fallthrough to the next case
				case "`":
					err = err ? err : "E033 malformed function call at " + path + "; proper form is [exprefix, \"`\", function, arguments]";
				case "given":
					err = err ? err : "E034 malformed name binding at " + path + "; proper form is [exprefix, \"given\", object, expression]";
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

Node.prototype.serialize = function(exprefix) {
	if(typeof this.value === "undefined") {
		throw new Error("E010 BUG: " + this + " doesn't have a value!");
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
			case "f":
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
	if(this.value instanceof Object) {
		var ret = {};
		for(var k in this.value) {
			ret[k] = this.value[k].serialize(exprefix);
		}
		return ret;
	}
	// must be a scalar then (null, boolean, number, or string)
	return this.value;
};

Node.prototype.eq = function(that) {
	if(this.value instanceof Array) {
		if(!(that.value instanceof Array)) {
			return false;
		}
		if(this.value.length != that.value.length) {
			return false;
		}
		for(var i = 0; i < this.value.length; i++) {
			if(!this.value[i].eq(that.value[i])) {
				return false;
			}
		}
	} else if(this.value instanceof Op) {
		if(this.value.op != that.value.op) {
			return false;
		}
		if(this.value.args.length != that.value.args.length) {
			return false;
		}
		for(var i = 0; i < this.value.args.length; i++) {
			if(!this.value.args[i].eq(that.value.args[i])) {
				return false;
			}
		}
	} else if(typeof this.value === "function") {
		if(!this.value.body.eq(that.value.body)) {
			return false;
		}
		if(this.value.args.length != that.value.args.length) {
			return false;
		}
		for(var i = 0; i < this.value.args.length; i++) {
			if(!this.value.args[i].eq(that.value.args[i])) {
				return false;
			}
		}
	} else if(this.value instanceof Object) {
		for(var k in this.value) {
			if(this.value.hasOwnProperty(k)) {
				if(that.value.hasOwnProperty(k)) {
					if(!this.value[k].eq(that.value[k])) {
						return false;
					}
				} else {
					return false;
				}
			}
		}
		for(k in that.value) {
			if(that.value.hasOwnProperty(k)) {
				if(!this.value.hasOwnProperty(k)) {
					return false;
				}
			}
		}
	} else { // it's a scalar, we can compare it with builtin ===
		return this.value === that.value;
	}
	return true;
};

module.exports.Op = Op;
module.exports.Node = Node;
module.exports.unserialize = unserialize;
