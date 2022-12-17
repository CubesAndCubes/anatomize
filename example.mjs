import { Anatomize } from '@cubesandcubes/anatomize';

const MyParser = new Anatomize(() => {
    return {
        type: 'Program',
        body: Program(),
    };
});

function Program() {
    const StatementList = [];

    while (!MyParser.isEOF())
        StatementList.push(Statement());

    return StatementList;
}

/* TOKENS */

MyParser.registerToken(null, /^[^\S\n]+/);

MyParser.registerToken('NUMBER', /^\d+/);

MyParser.registerToken('STRING', (read, peek, omit, eof, at, index) => {
    // proceed if the first char is either a single or double quote

    if (!['"', "'"].includes(peek()))
        return;

    // omit the opening quote

    omit();

    // read until end-of-file or same char as
    // at index 0 (same quote as opening quote)

    while (!eof() && peek() !== at(0))
        read();

    // if at end-of-file, throw an error

    if (eof())
        throw SyntaxError('Literal has not been terminated');

    // otherwise, omit the terminating quote

    omit();
});

MyParser.registerToken(';', /^;/);

MyParser.registerHiddenToken(';', /^\n+/);

/* FACTORIES */

function Statement() {
    const Content = Literal();

    terminateStatement();

    return Content;
}

function terminateStatement() {
    if (MyParser.isEOF())
        return;

    do {
        MyParser.read(';');
    } while (MyParser.isPeekType(';'))
}

function Literal() {
    switch (MyParser.peek().type) {
        case 'NUMBER':
            return NumLiteral();
        case 'STRING':
            return StrLiteral();
    }

    throw SyntaxError('Unknown Literal');
}

function NumLiteral() {
    const Token = MyParser.read('NUMBER');

    return {
        type: 'NumLiteral',
        value: Number(Token.value),
    };
}

function StrLiteral() {
    const Token = MyParser.read('STRING');

    return {
        type: 'StrLiteral',
        value: String(Token.value),
    };
}