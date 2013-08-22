var util = require('util');
var tokenizer = require('./tokenizer.js');
var tree = require('./tree.js');

var Parselet = function(bp, nud, led, val) {
	this.bp = bp;
	this.nud = nud;
	this.led = led;
	this.val = val;
	this.tok_type = "op";
	this.whereAt = "";
};

function defaultNud(t) {
	throw new Error("E015" + "Undefined. (worst error message)");
}

function defaultLed(t, left) {
	throw new Error("E016" + "Missing operator.");
}

function valNud(t) {
	return new tree.Node(this.whereAt, this.val);
}

function prefixNud(t) {
	var operand = parse(t, this.bp);
	var args = new tree.Node(operand.whereAt, [operand]);
	var name = new tree.Node(this.whereAt, this.val);
	var operator = new tree.Node(this.whereAt, new tree.Op("~", [name]));
	var n = new tree.Node(this.whereAt, new tree.Op("`", [operator, args]));
	name.parent = operator;
	operand.parent = args;
	operator.parent = args.parent = n;
	return n;
}

function negativeNud(t) {
	var operand = parse(t, this.bp);
	if(typeof operand.evald === "number") {
		return new tree.Node(this.whereAt, -1 * operand.evald);
	}
	throw new Error("E017" + util.format("syntax %s: expected number.", t.errPrefix()));
}

function nameNud(t) {
	var name = new tree.Node(this.whereAt, this.val);
	var n = new tree.Node(this.whereAt, new tree.Op("~", [name]));
	name.parent = n;
	return n;
}

function openArrayNud(t) {
	var a = [];
	var n = new tree.Node(this.whereAt, a);
	if(t.val !== "]") {
		while(true) {
			element = parse(t, 0);
			element.parent = n;
			a.push(element);
			if(t.val !== ",") {
				break;
			}
			t.checkValAndToke(",");
		}
	}
	t.checkValAndToke("]");
	return n;
}

function openObjectNud(t) {
	var o = {};
	var n = new tree.Node(this.whereAt, o);
	if(t.val !== "}") {
		while(true) {
			var k = t.val;
			t.checkTypeAndToke("string");
			t.checkValAndToke(":");
			var v = parse(t, 0);
			v.parent = n;
			o[k] = v;
			if(t.val !== ",") {
				break;
			}
			t.checkValAndToke(",");
		}
	}
	t.checkValAndToke("}");
	return n;
}

function letNud(t) {
	// let (foo=bar[,foo=bar...]) expr
	t.checkValAndToke("(");
	var o = {};
	var oN = new tree.Node(t.whereAt(), o);
	if(t.val !== ")") {
		while(true) {
			var k = t.val;
			t.checkTypeAndToke("name");
			t.checkValAndToke("=");
			var v = parse(t, 0);
			v.parent = oN;
			o[k] = v;
			if(t.val !== ",") {
				break;
			}
			t.checkValAndToke(",");
		}
	}
	t.checkValAndToke(")");
	var expr = parse(t, 0);
	var n = new tree.Node(this.whereAt, new tree.Op("given", [oN, expr]));
	oN.parent = expr.parent = n;
	return n;
}

function fNud(t) {
	// f([foo[,bar...]]) { expr }
	t.checkValAndToke("(");
	var a = [];
	var aN = new tree.Node(t.whereAt(), a);
	if(t.val !== ")") {
		while(true) {
			var name = new tree.Node(t.whereAt(), t.val);
			name.parent = aN;
			a.push(name);
			t.checkTypeAndToke("name");
			if(t.val !== ",") {
				break;
			}
			t.checkValAndToke(",");
		}
	}
	t.checkValAndToke(")");
	t.checkValAndToke("{");
	var body = parse(t, 0);
	t.checkValAndToke("}");
	var n = new tree.Node(this.whereAt, new tree.Func(this.whereAt, aN, body));
	aN.parent = body.parent = n;
	body.f = n.value;
	return n;
}

function parenNud(t) {
	var n = parse(t, 0);
	t.checkValAndToke(")");
	return n;
}

function infixLed(t, left) {
	var right = parse(t, this.bp);
	var operands = new tree.Node(this.whereAt, [left, right]);
	var name = new tree.Node(this.whereAt, this.val);
	var resolution = new tree.Node(this.whereAt, new tree.Op("~", [name]));
	var n = new tree.Node(this.whereAt, new tree.Op("`", [resolution, operands]));
	left.parent = right.parent = operands;
	name.parent = resolution;
	resolution.parent = operands.parent = n;
	return n;
}

function condLed(t, left) {
	var middle = parse(t, 0);
	t.checkValAndToke(':');
	var right = parse(t, this.bp);
	var operands = new tree.Node(this.whereAt, [left, middle, right]);
	var name = new tree.Node(this.whereAt, this.val);
	var resolution = new tree.Node(this.whereAt, new tree.Op("~", [name]));
	var n = new tree.Node(this.whereAt, new tree.Op("`", [resolution, operands]));
	left.parent = middle.parent = right.parent = operands;
	name.parent = resolution;
	resolution.parent = operands.parent = n;
	return n;
}

function callLed(t, left) {
	var args = [];
	var aN = new tree.Node(this.whereAt, args);
	if(t.val !== ")") {
		while(1) {
			var arg = parse(t, 0);
			arg.parent = aN;
			args.push(arg);
			if(t.val !== ",") {
				break;
			}
			t.checkValAndToke(",");
		}
	}
	t.checkValAndToke(")");
	var n = new tree.Node(this.whereAt, new tree.Op("`", [left, aN]));
	left.parent = aN.parent = n;
	return n;
}

function selectLed(t, left) {
	var right;
	if(this.val == "."){
		if(t.tok_type == "name"){
			right = new tree.Node(this.whereAt, t.val);
			t.checkTypeAndToke("name");
		} else {
			throw new Error("E018 " + util.format("syntax %s: expected identifier, have %s.", t.errPrefix(), t.tok_type));
		}
	} else {
		right = parse(t, 0);
		t.checkValAndToke("]");
	}
	var n = new tree.Node(this.whereAt, new tree.Op(".", [left, right]));
	left.parent = right.parent = n;
	return n;
}

var ops = {
	":":  new Parselet(0,  defaultNud,    defaultLed),
	",":  new Parselet(0,  defaultNud,    defaultLed),
	")":  new Parselet(0,  defaultNud,    defaultLed),
	"]":  new Parselet(0,  defaultNud,    defaultLed),
	"}":  new Parselet(0,  defaultNud,    defaultLed),
	"{":  new Parselet(0,  openObjectNud, defaultLed),
	"?":  new Parselet(10, defaultNud,    condLed),
	"||": new Parselet(20, defaultNud,    infixLed),
	"&&": new Parselet(30, defaultNud,    infixLed),
	"==": new Parselet(40, defaultNud,    infixLed),
	"!=": new Parselet(40, defaultNud,    infixLed),
	"<":  new Parselet(50, defaultNud,    infixLed),
	"<=": new Parselet(50, defaultNud,    infixLed),
	">":  new Parselet(50, defaultNud,    infixLed),
	">=": new Parselet(50, defaultNud,    infixLed),
	"+":  new Parselet(60, defaultNud,    infixLed),
	"-":  new Parselet(60, negativeNud,   infixLed),
	"*":  new Parselet(70, defaultNud,    infixLed),
	"/":  new Parselet(70, defaultNud,    infixLed),
	"%":  new Parselet(70, defaultNud,    infixLed),
	"!":  new Parselet(80, prefixNud,     defaultLed),
	"(":  new Parselet(90, parenNud,      callLed),
	".":  new Parselet(90, defaultNud,    selectLed),
	"[":  new Parselet(90, openArrayNud,  selectLed),
};
for(var op in ops) {
	ops[op].val = op;
}

function getParselet(t) {
	var p;
	switch(t.tok_type) {
		case "op":
			p = ops[t.val];
			break;
		case "name":
			p = new Parselet(0, nameNud);
			break;
		case "let":
			p = new Parselet(0, letNud);
			break;
		case "f":
			p = new Parselet(0, fNud);
			break;
		case "string":
		case "number":
		case "constant":
			p = new Parselet(0, valNud);
			break;
		case "over":
			return null;
		default:
			throw new Error("E009" + util.format("you tried to get a parselet for tok type %s", t.tok_type));
	}
	p.tok_type = t.tok_type;
	p.val = t.val;
	p.whereAt = t.whereAt();
	return p;
}

var parse = function(t, rbp) {
	p = getParselet(t);
	t.toke();
	left = p.nud(t);
	for(p = getParselet(t); p && rbp < p.bp; p = getParselet(t)) {
		t.toke();
		left = p.led(t, left);
	}
	return left;
};

module.exports.parse = parse;
