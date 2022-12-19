/*
    Anatomize.js v1.1.0 | A JavaScript-based framework for building parsers
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
export class Anatomize {
    #main;
    constructor(main) {
        if (typeof main !== 'function')
            throw TypeError(`Unexpected Main Function; Expected "function", got "${typeof main}"`);
        this.#main = main;
    }
    static #TokenizerClass = class {
        TokenTypes = [];
        #buffer;
        #index;
        #lookaheadBuffer;
        #lookaheadIndex;
        initialize(source) {
            this.#buffer = String(source);
            this.#index = 0;
            this.#lookaheadBuffer = [];
            this.#lookaheadIndex = 0;
            while (!this.#isEOF())
                this.#lookaheadBuffer.push(this.#readToken());
        }
        #isEOF() {
            return this.#index >= this.#buffer.length;
        }
        #readToken() {
            const INPUT = this.#buffer.slice(this.#index);
            for (const TokenType of this.TokenTypes) {
                let tokenValue = null;
                let tokenLength = 0;
                if (TokenType.matcher instanceof Anatomize.#Matcher) {
                    const MatchResults = TokenType.matcher.match(INPUT);
                    if (![false, null].includes(MatchResults[0])) {
                        tokenValue = MatchResults[1];
                        tokenLength = MatchResults[2];
                    }
                }
                else if (TokenType.matcher instanceof RegExp) {
                    tokenValue = INPUT.match(TokenType.matcher)?.[0] ?? null;
                    tokenLength = tokenValue?.length ?? 0;
                }
                else
                    throw TypeError('Unexpected Matcher');
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
            throw SyntaxError(`Undefined Token "${INPUT}"`);
        }
        peekToken(offset = 0) {
            return this.#lookaheadBuffer[this.#lookaheadIndex + offset] ?? null;
        }
        nextToken() {
            if (this.#lookaheadIndex >= this.#lookaheadBuffer.length)
                return null;
            return this.#lookaheadBuffer[this.#lookaheadIndex++];
        }
    };
    #Tokenizer = new Anatomize.#TokenizerClass();
    #errorIfParsing() {
        if (this.#parsing)
            throw SyntaxError('Unexpected Method Call; Method may not be called whilst parsing');
    }
    #parsing = false;
    parse(source) {
        this.#errorIfParsing();
        this.#parsing = true;
        this.#Tokenizer.initialize(source);
        try {
            return this.#main();
        }
        finally {
            this.#parsing = false;
        }
    }
    static #Matcher = class {
        #pattern;
        #buffer;
        #index;
        #result;
        #isEOF = () => this.#index >= this.#buffer.length;
        #charAt = (index) => this.#buffer[index];
        #peekChar = (offset = 0) => this.#buffer[this.#index + offset];
        static #constraintCheck = (input, constraint) => {
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
        #readChar = (constraint = null) => {
            if (this.#isEOF())
                throw RangeError('Unexpected End of Input; Cannot read another Character');
            if (constraint)
                if (!Anatomize.#Matcher.#constraintCheck(this.#buffer[this.#index], constraint))
                    return null;
            this.#result += this.#buffer[this.#index];
            return this.#buffer[this.#index++];
        };
        #omitChar = (constraint = null) => {
            if (this.#isEOF())
                throw RangeError('Unexpected End of Input; Cannot omit another Character');
            if (constraint)
                if (!Anatomize.#Matcher.#constraintCheck(this.#buffer[this.#index], constraint))
                    return null;
            return this.#buffer[this.#index++];
        };
        #getIndex = () => this.#index;
        constructor(pattern) {
            this.#pattern = pattern;
        }
        match(input) {
            this.#buffer = input;
            this.#index = 0;
            this.#result = '';
            return [
                this.#pattern(this.#readChar, this.#peekChar, this.#omitChar, this.#isEOF, this.#charAt, this.#getIndex),
                this.#result || null,
                this.#index,
            ];
        }
    };
    #addTokenType(name, matcher, hidden) {
        this.#errorIfParsing();
        if (typeof matcher !== 'function' && !(matcher instanceof RegExp))
            throw TypeError(`Unexpected Type of Matcher; Expected "function" or RegExp, got "${typeof matcher}"`);
        if (typeof matcher === 'function')
            matcher = new Anatomize.#Matcher(matcher);
        this.#Tokenizer.TokenTypes.push({
            name,
            matcher,
            hidden,
        });
    }
    registerToken(name, matcher) {
        this.#addTokenType(name, matcher, false);
    }
    registerHiddenToken(name, matcher) {
        this.#addTokenType(name, matcher, true);
    }
    #errorIfNotParsing() {
        if (!this.#parsing)
            throw SyntaxError('Unexpected Method Call; Method may only be called whilst parsing');
    }
    peek(offset = 0) {
        this.#errorIfNotParsing();
        let Token;
        do {
            Token = this.#Tokenizer.peekToken(offset++);
        } while (Token?.hidden);
        return Token?.hidden ? null : Token;
    }
    isEOF() {
        this.#errorIfNotParsing();
        return !this.peek();
    }
    isPeekType(tokenType, offset = 0) {
        return this.peek(offset)?.type === tokenType;
    }
    read(tokenType) {
        this.#errorIfNotParsing();
        let Token;
        do {
            Token = this.#Tokenizer.nextToken();
        } while (Token?.hidden && Token?.type !== tokenType);
        if (!Token)
            throw SyntaxError('Unexpected End of Input; Cannot read another Token');
        if (Token?.type !== tokenType)
            throw SyntaxError(`Unexpected Token; Expected "${tokenType}", got "${Token.type}"`);
        return Token;
    }
}
