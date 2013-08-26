/* jshint evil: true */
var buster = require("buster");
var fs = require("fs");
var util = require("util");

var tree = require("../tree.js");
var tokenizer = require("../tokenizer.js");
var parser = require("../parser.js");
var lib = require("../lib.js");

buster.assertions.add("nodesEq", {
	assert: function(a, b) {
		return a instanceof tree.Node && b instanceof tree.Node && a.eq(b);
	},
	assertMessage: "Expected\n\n${0}\n\nto be the equivalent node of\n\n${1}\n",
	refuteMessage: "Didn't expect\n\n${0}\n\nto be the equivalent node of\n\n${1}\n",
	expectation: "toBeEq"
});

function makeTest(v, i, arr) {
	var name = v.name || v.scripty;
	tests[name] = function() {
		try {
			var parseTree, st, sParse, zParse;
			if(typeof v.scripty !== "undefined") {
				st = tokenizer.New(v.scripty);
				sParse = parser.parse(st, 0);
				parseTree = sParse;
			}
			if(typeof v.serialized !== "undefined") {
				zParse = tree.unserialize(v.serialized, "X");
				parseTree = zParse;
			}
			if(sParse && zParse) {
				assert.equals(v.serialized, sParse.serialize("X"));
				assert.nodesEq(zParse, sParse);
			}
			var result = lib.eval(parseTree);
			if(typeof v.evald !== "undefined") {
				assert.equals(v.evald, result);
			} else {
				buster.assertions.fail(util.format("expected error, but got result %j", result));
			}
		} catch (e) {
			if(e.message.substr(0, 8) == "bad test") {
				throw e;
			}
			if(v.err) {
				assert.same(v.err, e.message.substr(0, 4));
			} else {
				buster.assertions.fail(util.format("unexpected error %s", e.message));
			}
		}
	};
}

var testfile = fs.readFileSync("./test/spec.json", {encoding: "utf8"});
var testObj = JSON.parse(testfile);
var tests;
for(var caseName in testObj) {
	if(testObj.hasOwnProperty(caseName)) {
		tests = {};
		testObj[caseName].forEach(makeTest);
		buster.testCase(caseName, tests);
	}
}
