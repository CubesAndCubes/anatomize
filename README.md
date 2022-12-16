# Anatomize

Anatomize - A JavaScript-based framework for building parsers.

## Basic Setup

The first step to building a parser with Anatomize is to create a new instance of it.

The Anatomize constructor requires you to provide a main function that handles generating the AST (Abstract Syntax Tree) when parsing. We use objects to represent individual nodes in the AST.

```javascript
const MyParser = new Anatomize(() => {
  return {
    type: 'Program',
    body: Program(),
  }
});

function Program() {

}
```

Down below you'll find a guide on adding some common features to your parser. Following along will teach you the basics of Anatomize and how to structure your parser.

## Implementing Numeric Literals

Starting off easy, let's implement basic numeric literals into our parser. That'll be simple integer numbers.

First, we register a token for our numeric literals to use. A token has a name string and a matcher that can either be a RegExp (Regular Expression) or a function using Anatomize's custom matching utilities. The matcher is a description of the token so it can be recognized in the source.

We'll call the token "NUMBER" and use a RegExp that matches one or multiple digits.

```javascript
MyParser.registerToken('NUMBER', /^\d+/);
```

*When using RegExps as token matchers, it's important to always start them with the "^" (Start-of-String) anchor in order to avoid bugs.*

Next, we create a function that reads our "NUMBER" token and from it returns a node for our AST. Anatomize's `read()` method takes the type of the token that's to be read, and if the type equals that of the next token in the buffer, the method returns a token object containing the token's type and value (the match result) and advances the buffer to the next token. If the type is wrong, Anatomize throws an error.

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

Try parsing a source containing only a number with Anatomize's `parse()` method now and see what's returned.

```javascript
console.log(
  MyParser.parse('5')
);
```

## Implementing String Literals

Increasing the difficulty slightly, let's next implement string literals into our parser.

We'll again register a token, but this time using an Anatomize matcher.

Anatomize matchers are much more powerful than RegExps. They are provided with the following methods in the order presented here:

- **readChar()** : Reads the next character, adding it to the match result, and returns it.

- **peekChar(offset = 0)** : Returns the next character (without reading), shifted by the provided offset.

- **omitChar()** : Reads the next character without adding it to the match result and returns it.

- **isEOF()** : Returns whether or not there are more characters to read.

- **charAt(index)** : Returns the character at the provided index.

- **getIndex()** : Returns the current index.

*The names of the methods can be chosen freely. What matters is the order in which they are included.*

We'll take advantage of the benefits of Anatomize matchers to support both single and double quotes for string definition and to throw an error in case of bad syntax.

```javascript
MyParser.registerToken('STRING', (read, peek, omit, eof, at, index) => {
  // proceed if the first char is either a single or double quote

  if (!['"', "'"].includes(peek()))
    return;

  // omit the opening quote

  omit();

  // read until end-of-file or same char
  // as at index 0 (same quote as opening quote)

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

Since we have two types of literals now, numeric and string, it makes sense to create a function that wraps them. Anatomize's `peek()` method returns a token object containing the next token's type and value without reading it, thus not yet advancing the buffer. `peek()` can optionally be supplied with an offset.

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
  MyParser.parse('5') // number
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
