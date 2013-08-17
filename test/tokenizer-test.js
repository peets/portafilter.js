var buster = require("buster");
var tokenizer = require("../tokenizer.js");

buster.testCase("tokenizer tire kick", {
	"combined": function() {
		t = tokenizer.New("1 + 2.2 - 3.4e56 * \"abc\" && foo!=$bar / (_baz ? quux0 : ok_I_get_it) true false null function let");
		assert.same(t.tok_type, "number");
		assert.same(t.val, 1);
		t.toke();
		assert.same(t.tok_type, "op");
		assert.same(t.val, "+");
		t.toke();
		assert.same(t.tok_type, "number");
		assert.same(t.val, 2.2);
		t.toke();
		assert.same(t.tok_type, "op");
		assert.same(t.val, "-");
		t.toke();
		assert.same(t.tok_type, "number");
		assert.same(t.val, 3.4e56);
		t.toke();
		assert.same(t.tok_type, "op");
		assert.same(t.val, "*");
		t.toke();
		assert.same(t.tok_type, "string");
		assert.same(t.val, "abc");
		t.toke();
		assert.same(t.tok_type, "op");
		assert.same(t.val, "&&");
		t.toke();
		assert.same(t.tok_type, "name");
		assert.same(t.val, "foo");
		t.toke();
		assert.same(t.tok_type, "op");
		assert.same(t.val, "!=");
		t.toke();
		assert.same(t.tok_type, "name");
		assert.same(t.val, "$bar");
		t.toke();
		assert.same(t.tok_type, "op");
		assert.same(t.val, "/");
		t.toke();
		assert.same(t.tok_type, "op");
		assert.same(t.val, "(");
		t.toke();
		assert.same(t.tok_type, "name");
		assert.same(t.val, "_baz");
		t.toke();
		assert.same(t.tok_type, "op");
		assert.same(t.val, "?");
		t.toke();
		assert.same(t.tok_type, "name");
		assert.same(t.val, "quux0");
		t.toke();
		assert.same(t.tok_type, "op");
		assert.same(t.val, ":");
		t.toke();
		assert.same(t.tok_type, "name");
		assert.same(t.val, "ok_I_get_it");
		t.toke();
		assert.same(t.tok_type, "op");
		assert.same(t.val, ")");
		t.toke();
		assert.same(t.tok_type, "constant");
		assert.same(t.val, true);
		t.toke();
		assert.same(t.tok_type, "constant");
		assert.same(t.val, false);
		t.toke();
		assert.same(t.tok_type, "constant");
		assert.same(t.val, null);
		t.toke();
		assert.same(t.tok_type, "f");
		assert.same(t.val, "f");
		t.toke();
		assert.same(t.tok_type, "let");
		assert.same(t.val, "let");
		t.toke();
		assert.same(t.tok_type, "over");
		assert.same(t.val, "end of stream");
		t.toke();
		assert.same(t.tok_type, "over");
		assert.same(t.val, "end of stream");
	}
});
