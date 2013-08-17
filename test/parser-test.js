var buster = require("buster");
var tokenizer = require("../tokenizer.js");
var parser = require("../parser.js");

buster.testCase("parser tire kick", {
	"scalars": function() {
		var t = tokenizer.New("\"abc\"");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.same("abc", s);
		t = tokenizer.New("123.456");
		n = parser.parse(t, 0);
		s = n.serialize("X");
		assert.same(123.456, s);
		t = tokenizer.New("null");
		n = parser.parse(t, 0);
		s = n.serialize("X");
		assert.isNull(s);
		t = tokenizer.New("true");
		n = parser.parse(t, 0);
		s = n.serialize("X");
		assert.same(true, s);
		t = tokenizer.New("false");
		n = parser.parse(t, 0);
		s = n.serialize("X");
		assert.same(false, s);
	},
	"prefix": function() {
		var t = tokenizer.New("!false");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "`", ["X", "~", "!"], [false]], s);
	},
	"negative": function() {
		var t = tokenizer.New("-0.12");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.same(-0.12, s);
	},
	"name": function() {
		var t = tokenizer.New("foo");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "~", "foo"], s);
	},
	"array": function() {
		var t = tokenizer.New("[1, 2, [true, false]]");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals([1, 2, [true, false]], s);
	},
	"object": function() {
		var t = tokenizer.New('{"a": 1, "b": null, "c":{"d":[3e8, 6.023E-88]}}');
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals({"a": 1, "b": null, "c":{"d":[3E8, 6.023e-88]}}, s);
	},
	"let": function() {
		var t = tokenizer.New("let(a=b) true");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "given", {"a": ["X", "~", "b"]}, true], s);
		var t = tokenizer.New('let(a=b, c = "d" % 2) 1 / 0');
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "given", {"a": ["X", "~", "b"], "c": ["X", "`", ["X", "~", "%"], ["d", 2]]}, ["X", "`", ["X", "~", "/"], [1, 0]]], s);
		var t = tokenizer.New('let ( a = 13 ) a');
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "given", {"a": 13}, ["X", "~", "a"]], s);
		var t = tokenizer.New('let(a = 40 + 2) a');
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "given", {"a": ["X", "`", ["X", "~", "+"], [40, 2]]}, ["X", "~", "a"]], s);
	},
	"f": function() {
		var t = tokenizer.New("f(a, b) { false }");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "f", ["a", "b"], false], s);
		var t = tokenizer.New("f() { true && !false }");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "f", [], ["X", "`", ["X", "~", "&&"], [true, ["X", "`", ["X", "~", "!"], [false]]]]], s);
		var t = tokenizer.New("f(a, b) { a + b }(1, 2)");
		var n = parser.parse(t, 0);
		var v = n.serialize("X");
		assert.equals(v, ["X", "`", ["X", "f", ["a", "b"], ["X", "`", ["X", "~", "+"], [["X", "~", "a"], ["X", "~", "b"]]]], [1, 2]]);
	},
	"paren": function() {
		var t = tokenizer.New("1 * (2 + 3)");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "`", ["X", "~", "*"], [1, ["X", "`", ["X", "~", "+"], [2, 3]]]], s);
	},
	"infix": function() {
		var t = tokenizer.New("1 + 2");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "`", ["X", "~", "+"], [1, 2]], s);
	},
	"cond": function() {
		assert(true); // WEMUST
	},
	"call": function() {
		var t = tokenizer.New("foo(1)");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "`", ["X", "~", "foo"], [1]], s);
		var t = tokenizer.New("foo()");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "`", ["X", "~", "foo"], []], s);
		var t = tokenizer.New("foo(true || false, 1)");
		var n = parser.parse(t, 0);
		var s = n.serialize("X");
		assert.equals(["X", "`", ["X", "~", "foo"], [["X", "`", ["X", "~", "||"], [true, false]], 1]], s);
	}
});
