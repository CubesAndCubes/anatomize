# Anatomize

Anatomize - A JavaScript-based framework for building parsers.

Anatomize is licensed under version 3 of the GNU Lesser General Public License. See [COPYING](https://github.com/CubesAndCubes/anatomize/blob/master/COPYING) and [COPYING.LESSER](https://github.com/CubesAndCubes/anatomize/blob/master/COPYING.LESSER) for more details.

## Basic Setup

The first step to building a parser with Anatomize is to import it and to create a new instance of it.

The Anatomize constructor requires you to provide a main function that handles generating the AST (Abstract Syntax Tree). We use objects to represent individual nodes in the AST.

```javascript
import { Anatomize } from './anatomize.js';

const MyParser = new Anatomize(() => {
  return {
    type: 'Program',
    body: Program(),
  };
});

function Program() {

}
```

Down below you'll find a guide on adding some common features to your parser. Follow along to learn the basics of Anatomize and how to structure your parser.

*It's recommended that you already know how parsers generally work.*

## Implementing Numeric Literals

Starting off easy, let's implement basic numeric literals into our parser. That'll only be simple integer numbers in this implementation.

First, we register a token type for our numeric literals to use. That we do with Anatomize's `registerToken(name, matcher)` method. A token has a name and a matcher that can either be a RegExp (Regular Expression) or a function using Anatomize's custom matching utilities. The matcher is a description of the token so it can be recognized in the source.

We'll call the token `"NUMBER"` and use a RegExp that matches one or multiple digits.

```javascript
MyParser.registerToken('NUMBER', /^\d+/);
```

*When using RegExps as token matchers, it's important to always start them with the `^` (Start-of-String) anchor in order to avoid bugs.*

Next, we create a function that reads our `"NUMBER"` token and from it returns a node for our AST. Anatomize's `read(type)` method takes the type of the token that's to be read, and if the type equals that of the next token in the buffer, the method returns a token object containing the token's type and value (the match result) and advances the buffer to the next token. If the type is unequal, Anatomize throws an error.

```javascript
function NumLiteral() {
  const Token = MyParser.read('NUMBER');

  return {
    type: 'NumLiteral',
    value: Number(Token.value),
  };
}
```

Finally, we include the function we just created into our AST generation logic.

```javascript
function Program() {
  return NumLiteral();
}
```

Try parsing a source containing only a number with Anatomize's `parse(source)` method and see what's returned.

```javascript
console.log(
  MyParser.parse('5')
);
```

## Implementing String Literals

Increasing the difficulty slightly, let's next implement string literals into our parser.

We'll again register a token type, but this time using an Anatomize matcher.

Anatomize matchers are much more powerful than RegExps. They are provided with the following methods in the order presented here:

- `readChar()` : Reads the next character, adding it to the match result, and returns it.

- `peekChar(offset = 0)` : Returns the, shifted by the provided offset, next character (without reading).

- `omitChar()` : Reads the next character without adding it to the match result and returns it.

- `isEOF()` : Returns whether or not there are more characters to read.

- `charAt(index)` : Returns the character at the provided index.

- `getIndex()` : Returns the current index.

*The names of the methods can be chosen freely. What matters is the order in which they are included.*

We'll take advantage of the benefits of Anatomize matchers to support both single and double quotes for string definition and to throw an error in case of bad syntax.

```javascript
MyParser.registerToken('STRING', (read, peek, omit, eof, at, index) => {
  // proceed if the first char is either a single or double quote

  if (!['"', "'"].includes(peek()))
    return;

  // omit the opening quote

  omit();

  // read until end-of-file or same char as
  // at index 0 (same quote as opening quote)

  while(!eof() && peek() !== at(0))
    read();

  // if at end-of-file, throw an error

  if (eof())
    throw SyntaxError('Literal has not been terminated');

  // otherwise, omit the terminating quote

  omit();
});
```

Now that we've registered the token, we'll create a function that returns string literal nodes.

```javascript
function StrLiteral() {
  const Token = MyParser.read('STRING');

  return {
    type: 'StrLiteral',
    value: String(Token.value),
  };
}
```

Since we have two types of literals now, numeric and string, it makes sense to create a function that wraps them. Anatomize's `peek(offset = 0)` method returns a token object containing the, considering the provided offset, next token's type and value without reading it, thus not yet advancing the buffer.

```javascript
function Literal() {
  switch (MyParser.peek().type) {
    case 'NUMBER':
      return NumLiteral();
    case 'STRING':
      return StrLiteral();
  }

  throw SyntaxError('Unknown Literal');
}
```

Let's adjust our AST generator to support both literals.

```javascript
function Program() {
  return Literal();
}
```

Try parsing numeric and string literals now and see what happens.

```javascript
console.log(
  MyParser.parse('5') // integer
);

console.log(
  MyParser.parse('"foo"') // string using double quotes
);

console.log(
  MyParser.parse("'bar'") // string using single quotes
);

console.log(
  MyParser.parse('"Hello, World!') // unterminated - throws error
);
```

## Discarding Whitespace

Our parser, right now, will get confused by whitespace. Try parsing the following source and see what happens.

```javascript
console.log(
  MyParser.parse(' 1 ')
);
```

Unless whitespace is relevant in your language, we can remove it to make our parser's job a little easier. Tokens that are registered with a name of `null` are automatically discarded.

```javascript
MyParser.registerToken(null, /^\s+/);
```

Try parsing the source again now with whitespace registered as a to-be-discarded token.

## Supporting A Series of Statements

As it stands, our parser only supports a source to contain a single statement. Let's change that.

We first need a token for separating individual statements. As is tradition in programming languages, we'll use a `;` (semicolon).

```javascript
MyParser.registerToken(';', /^;/);
```

Now to adjusting our AST generator.

Let's first introduce a new function for our statement terminator. We'll make terminating a statement optional if we determine that we've reached the end of the file. Anatomize's `isEOF()` method returns whether or not the end of the file has been reached. Its `isPeekType(type, offset = 0)` method returns whether or not the next token, shifted by the provided offset, is of the provided type.

```javascript
function terminateStatement() {
  if (MyParser.isEOF())
    return;

  do {
    MyParser.read(';');
  } while (MyParser.isPeekType(';'))
}
```

We'll also introduce a wrapper function for statements.

```javascript
function Statement() {
  const Content = Literal();

  terminateStatement();

  return Content;
}
```

Finally, we'll adjust our AST generator to return a list that we fill with statements until we reached the end of the file.

```javascript
function Program() {
  const StatementList = [];

  while (!MyParser.isEOF())
    StatementList.push(Statement());

  return StatementList;
}
```

Try chaining together some statements now and see what happens.

```javascript
console.log(
  MyParser.parse('1; 5; "Hello, World!"')
);
```

## Automatic Semicolon Insertion

As the final part of this guide, we'll implement ASI (Automatic Semicolon Insertion) into our parser. It's a common feature amongst modern programming languages. Essentially, we register `\n` (newline) as a fallback token to semicolon.

Anatomize's `registerHiddenToken(name, matcher)` allows you to register a special kind of token. If the `peek()` method is called on it, the token after it will be peeked instead. And, if the `read()` method is called on it expecting a type other than its, it's automatically discarded and `read()` is again executed.

Using this knowledge, we register a hidden token matching for newlines that's called just like our semicolon token.

```javascript
MyParser.registerHiddenToken(';', /^\n+/);
```

Since newlines have now become relevant, we need to slightly adjust our whitespace discarder to only match any whitespace except newlines.

```javascript
MyParser.registerToken(null, /^[^\S\n]+/);
```

Try parsing a source where statements are only separated by newlines now and see what happens.

```javascript
console.log(
    MyParser.parse(`
    1
    "foo"
    2
    'bar'
    `)
);
```

---

This concludes the guide on the basics of Anatomize. Thank you for reading and showing interest in Anatomize!
