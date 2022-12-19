/*
	Anatomize.js v1.0.2 | A JavaScript-based framework for building parsers
	Copyright (C) 2022  CubesAndCubes

	Anatomize is free software: you can redistribute it and/or modify
	it under the terms of the GNU Lesser General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Anatomize is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Lesser General Public License for more details.

	You should have received a copy of the GNU Lesser General Public License
	along with Anatomize.  If not, see <https://www.gnu.org/licenses/>.
*/

interface TokenType {
	name: string;
	matcher: Function | RegExp;
	hidden: boolean;
}

interface Token {
	type: string;
	value: string;
	hidden: boolean;
}

export class Anatomize {
	#main: Function;

	constructor(main: Function) {
		if (typeof main !== 'function')
			throw TypeError(
				`Unexpected Main Function; Expected "function", got "${typeof main}"`
			);

		this.#main = main;
	}

	static #TokenizerClass = class {
		TokenTypes: Array<TokenType> = [];
		#buffer: string;
		#index: number;
		#lookaheadBuffer: Array<Token>;
		#lookaheadIndex: number;

		initialize(source: string) {
			this.#buffer = String(source);
			this.#index = 0;
			this.#lookaheadBuffer = [];
			this.#lookaheadIndex = 0;

			while(!this.#isEOF())
				this.#lookaheadBuffer.push(this.#readToken());
		}

		#isEOF() {
			return this.#index >= this.#buffer.length;
		}

		#readToken(): Token {
			const INPUT = this.#buffer.slice(this.#index);

			for (const TokenType of this.TokenTypes) {
				let tokenValue: string;
				let tokenLength: number;

				if (typeof TokenType.matcher === 'function') {
					let matcherIndex = 0;
					let matcherResult = '';

					const isEOF = () => matcherIndex >= INPUT.length;

					const charAt = (i: number) => INPUT[i];

					const peekChar = (offset = 0) => INPUT[matcherIndex + offset];

					const constraintCheck = (
						input: string,
						constraint: string | Array<string>,
					) => {
						if (Array.isArray(constraint))
							if (constraint.includes(input))
								return true;
							else
								return false;

						if (String(constraint).slice(0, 1) === input)
							return true;
						else
							return false;
					};

					const readChar = (constraint: string | Array<string> = null) => {
						if (isEOF())
							throw RangeError(
								'Unexpected End of Input; Cannot read another Character'
							);

							if (constraint)
								if (!constraintCheck(INPUT[matcherIndex], constraint))
									return null;

							matcherResult += INPUT[matcherIndex];

							return INPUT[matcherIndex++];
					};

					const omitChar = (constraint: string = null) => {
						if (isEOF())
							throw RangeError(
								'Unexpected End of Input; Cannot omit another Character'
							);

						if (constraint)
							if (!constraintCheck(INPUT[matcherIndex], constraint))
								return null;

						return INPUT[matcherIndex++];
					}

					const getIndex = () => matcherIndex;

					const MATCHER_RETURN = TokenType.matcher(
						readChar,
						peekChar,
						omitChar,
						isEOF,
						charAt,
						getIndex,
					);

					if ([false, null].includes(MATCHER_RETURN)) {
						tokenValue = null;
						tokenLength = 0;
					}
					else {
						tokenValue = matcherResult || null;
						tokenLength = matcherIndex;
					}
				}
				else if (TokenType.matcher instanceof RegExp) {
					tokenValue = INPUT.match(TokenType.matcher)?.[0] ?? null;
					tokenLength = tokenValue?.length ?? 0;
				}
				else throw TypeError('Unexpected Matcher');

				if (!tokenValue && 1 > tokenLength)
					continue;

				this.#index += tokenLength;

				if (!TokenType.name || !tokenValue) {
					if (this.#isEOF())
						return null;

					return this.#readToken();
				}

				return {
					type: TokenType.name,
					value: tokenValue,
					hidden: TokenType.hidden,
				};
			}

			throw SyntaxError(
				`Undefined Token "${INPUT}"`
			);
		}

		peekToken(offset = 0): Token {
			return this.#lookaheadBuffer[this.#lookaheadIndex + offset] ?? null;
		}

		nextToken(): Token {
			if (this.#lookaheadIndex >= this.#lookaheadBuffer.length)
				return null;

			return this.#lookaheadBuffer[this.#lookaheadIndex++];
		}
	}

	#Tokenizer = new Anatomize.#TokenizerClass();

	#errorIfParsing() {
		if (this.#parsing)
			throw SyntaxError(
				'Unexpected Method Call; Method may not be called whilst parsing'
			);
	}

	#parsing = false;

	parse(source: string) {
		this.#errorIfParsing();

		this.#Tokenizer.initialize(source);

		this.#parsing = true;

		const RESULT = this.#main();

		this.#parsing = false;

		return RESULT;
	}

	#addTokenType(name: string, matcher: RegExp | Function, hidden: boolean) {
		this.#errorIfParsing();

		if (typeof matcher !== 'function' && !(matcher instanceof RegExp))
			throw TypeError(
				`Unexpected Type of Matcher; Expected "function" or RegExp, got "${typeof matcher}"`
			);

		this.#Tokenizer.TokenTypes.push({
			name,
			matcher,
			hidden,
		});
	}

	registerToken(name: string, matcher: RegExp | Function) {
		this.#addTokenType(name, matcher, false);
	}

	registerHiddenToken(name: string, matcher: RegExp | Function) {
		this.#addTokenType(name, matcher, true);
	}

	#errorIfNotParsing() {
		if (!this.#parsing)
			throw SyntaxError(
				'Unexpected Method Call; Method may only be called whilst parsing'
			);
	}

	peek(offset = 0) {
		this.#errorIfNotParsing();

		let Token: Token;

		do {
			Token = this.#Tokenizer.peekToken(offset++);
		} while (Token?.hidden)

		return Token?.hidden ? null : Token;
	}

	isEOF() {
		this.#errorIfNotParsing();

		return !this.peek();
	}

	isPeekType(tokenType: string, offset = 0) {
		return this.peek(offset)?.type === tokenType;
	}

	read(tokenType: string) {
		this.#errorIfNotParsing();

		let Token: Token;

		do {
			Token = this.#Tokenizer.nextToken();
		} while (Token?.hidden && Token?.type !== tokenType)

		if (!Token)
			throw SyntaxError(
				'Unexpected End of Input; Cannot read another Token'
			);

		if (Token?.type !== tokenType)
			throw SyntaxError(
				`Unexpected Token; Expected "${tokenType}", got "${Token.type}"`
			);

		return Token;
	}
}
