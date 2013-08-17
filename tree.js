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
//		console.log("serialize args => ", this.value.args);
		switch(this.value.op) {
			case "~":
				if(this.value.args.length != 1) {
					throw new Error("E014 BUG: " + this.value + " is '~' but doesn't have exactly one arg (args is " + this.value.args.serialize("X") + ")");
				}
//				console.log("serialize args[0] => ", this.value.args[1]);
				return [exprefix, "~", this.value.args[0].serialize(exprefix)]
			case "given":
			case ".":
			case "`":
			case "f":
				if(this.value.args.length != 2) {
					throw new Error("E013 BUG: " + this.value + " is '" + this.value.op + "' but doesn't have exactly two args");
				}
//				console.log("serialize args[1] => ", this.value.args[1]);
//				console.log("args[1] instanceof Node =>", this.value.args[1] instanceof Node);
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

module.exports.Op = Op;
module.exports.Node = Node;
