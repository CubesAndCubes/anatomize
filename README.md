# Anatomize

Anatomize - A JavaScript-based framework for building parsers.

## Basic Setup

The first step to building a parser is to create a new instance of Anatomize.

The Anatomize constructor requires you to provide a main function that handles generating the AST (Abstract Syntax Tree) when parsing.

```javascript
const MyParser = new Anatomize(() => {
  return {
    type: 'Program',
    body: Program(),
  }
});

function Program() {
  //
}
```

## Implementing Numeric Literals

Starting off easy, we'll implement numeric literals into our parser.

First, we register a token for our numeric literals to use. A token has a name string and a matcher that can either be a RegExp (Regular Expression) or a function using Anatomize's custom matching utilities. The matcher describes the token so it can be detected in the source.

We'll call the token "NUMBER" and provide a RegExp that matches one or more digits.

```javascript
MyParser.registerToken('NUMBER', /^\d+/);
```

*When using RegExps as token matchers, it's important to start them with the '^' (Start-of-String) anchor to avoid bugs.*

Next, we create a function that reads our "NUMBER" token and from it returns a node for our AST.

```javascript
function NumLiteral() {
  const Token = Parser.read('NUMBER');

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

Try parsing a source containing only a number now and see what's returned.

```javascript
console.log(
  MyParser.parse('5');
);
```
