# Anatomize

Anatomize - A JavaScript-based framework for building parsers.

## Basic Setup

The first step to building a parser is to create a new instance of Anatomize.

The Anatomize constructor requires you to provide a main function that handles generating the AST (Abstract Syntax Tree) whilst parsing.

```
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
