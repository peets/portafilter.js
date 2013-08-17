var util = require('util');

var one2nine = /[1-9]/;
var obviousOneCharOp = /[\{\}\[\]\(\)\:\.\+\-\*\/%\?]/;
var opPrefix = /[><=!&\|]/;
var opSuffix = /[=&\|]/;
var twoCharOp = /&&|\|\||==|!=|<=|>=/;
var trickyOneCharOp = /[><!]/;
var identStart = /[$_A-Za-z]/;
var identContinue = /[$_A-Za-z0-9]/;

var Tokenizer = function(src) {
	this.src = src;
	this.tok_type = "start of stream";
	this.over = false;
	this.pos = 0;
	this.val = "";
	this.c = "";
	this.line = 1;
	this.character = 0;
	this.step(); // read first character
	this.toke(); // set first token
}

Tokenizer.prototype.whereAt = function() {
	if(this.tok_line > 1) {
		return util.format("line %d, character %d", this.tok_line, this.tok_char);
	}
	return util.format("character %d", this.tok_char);
};
Tokenizer.prototype.errPrefix = function() {
	return "error at " + this.whereAt();
};

Tokenizer.prototype.step = function() {
	if(this.pos < this.src.length) {
		this.c = this.src[this.pos];
		if(this.c == "\n") {
			this.line += 1;
			this.character = 0;
		} else {
			this.character += 1;
		}
		this.pos += 1;
	} else {
		this.c = "end of stream";
		this.over = true;
	}
};

Tokenizer.prototype.toke = function() {
	while(this.c.match(/^\s$/)) {
		this.step();
	}

	this.tok_line = this.line;
	this.tok_char = this.character;

	if(this.over) {
		this.tok_type = "over";
		this.val = "end of stream";
	} else if(this.c == '"') {
		this.tok_type = "string";
		this.val = "";
		// WEMUST: process escapes.
		// For the time being, this is not necessary. Assume host (js) has already processed the string
		// (which it has). So, for now, no need to double-escape. It's also impossible to include '"' in your strings, but hush, we'll come back and fix this later.
		for(this.step(); this.c != '"'; this.step()) {
			if(this.over) {
				return ["E007", util.format("syntax %s: unexpected end of stream; expected '\"'.", this.errPrefix(), this.c)];
			}
			this.val += this.c;
		}
		this.step(); // consume the closing '"'
	} else if(this.c.match(/\d/)) {
		this.tok_type = "number";
		this.val = this.c;
		if(this.c != "0") {
			// collect more digits, if any
			for(this.step(); (!this.over) && this.c.match(/\d/); this.step()) {
				this.val += this.c;
			}
		} else {
			this.step(); // consume the "0".
		}
		if(this.c == ".") {
			this.val += this.c;
			// collect more digits, if any
			var haveDigits = false;
			for(this.step(); (!this.over) && this.c.match(/\d/); this.step()) {
				this.val += this.c;
				haveDigits = true;
			}
			if(!haveDigits) {
				return ["E006", util.format("syntax %s: unexpected '%s'; expected digit.", this.errPrefix(), this.c)];
			}
		}
		if(this.c == "e" || this.c == "E") {
			this.val += this.c;
			this.step(); // consume the "e" or "E"
			if(this.c == "+" || this.c == "-") {
				this.val += this.c;
				this.step(); // consume
			}
			var haveDigits = false;
			for(; (!this.over) && this.c.match(/\d/); this.step()) {
				this.val += this.c;
				haveDigits = true;
			}
			if(!haveDigits) {
				return ["E005", util.format("syntax %s: unexpected '%s'; expected digit.", this.errPrefix(), this.c)];
			}
		}
	} else {
		// perharps an operator, or maybe an identifier
		this.tok_type = "op";
		this.val = this.c;
		if(this.c.match(obviousOneCharOp)) {
			// single-character operator
			this.step(); // consume operator character
		} else if(this.c.match(opPrefix)) {
			// potentially a two-character operator
			this.step();
			if(this.c.match(opSuffix)) {
				this.val += this.c
				if(!this.val.match(twoCharOp)) {
					return ["E004", util.format("syntax %s: unexpected %s", this.errPrefix(), this.c)];
				}
				this.step(); // consume second character
			} else {
				if(!this.val.match(trickyOneCharOp)) {
					return ["E001", util.format("syntax %s: unexpected %s", this.errPrefix(), this.c)];
				}
			}
		} else {
			// must be an identifier then
			this.tok_type = "name";
			this.val = "";
			for(var first = true; (!this.over) && this.c.match(first ? identStart : identContinue); this.step()) {
				first = false;
				this.val += this.c;
			}
			if(this.val == "") {
				return ["E008", util.format("syntax %s: unexpected %s", this.errPrefix(), this.c)];
			}
		}
	}
	return null;
};

Tokenizer.prototype.checkCharAndToke = function(check) {
	if(this.c != check) {
		return ["E002", util.format("syntax %s: unexpected '%s'; expected '%s'.", this.errPrefix(), this.c, check)];
	}
	return this.toke();
};

Tokenizer.prototype.checkTypeAndToke = function(check) {
	if(this.tok_type != check) {
		return ["E003", util.format("syntax %s: unexpected %s; expected %s.", this.errPrefix(), this.tok_type, check)];
	}
	return this.toke();
};

module.exports.New = function(src) {
	return new Tokenizer(src);
}
