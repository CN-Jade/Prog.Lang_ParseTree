const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Token types
const TokenType = {
    NUMBER: 'NUMBER',
    OPERATOR: 'OPERATOR',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    FUNCTION: 'FUNCTION',
    COMMA: 'COMMA'
};

// Lexer function to tokenize the input
function tokenize(input) {
    const tokens = [];
    let current = 0;

    while (current < input.length) {
        let char = input[current];

        // Handle whitespace
        if (/\s/.test(char)) {
            current++;
            continue;
        }

        // Handle numbers
        if (/[0-9]/.test(char)) {
            let value = '';
            while (/[0-9]/.test(char)) {
                value += char;
                char = input[++current];
            }
            tokens.push({ type: TokenType.NUMBER, value });
            continue;
        }

        // Handle operators
        if (/[+\-*/]/.test(char)) {
            tokens.push({ type: TokenType.OPERATOR, value: char });
            current++;
            continue;
        }

        // Handle parentheses
        if (char === '(') {
            tokens.push({ type: TokenType.LPAREN, value: '(' });
            current++;
            continue;
        }
        if (char === ')') {
            tokens.push({ type: TokenType.RPAREN, value: ')' });
            current++;
            continue;
        }

        // Handle functions (like max)
        if (/[a-z]/i.test(char)) {
            let value = '';
            while (char && /[a-z]/i.test(char)) {
                value += char;
                char = input[++current];
            }
            tokens.push({ type: TokenType.FUNCTION, value });
            continue;
        }

        // Handle comma
        if (char === ',') {
            tokens.push({ type: TokenType.COMMA, value: ',' });
            current++;
            continue;
        }

        throw new Error(`Unexpected character: ${char}`);
    }

    return tokens;
}

// Parser function to generate Parse Tree
function generateParseTree(tokens) {
    let current = 0;

    function parseExpression(precedence = 0) {
        let left = parsePrimary();

        while (current < tokens.length) {
            const token = tokens[current];
            if (token.type !== TokenType.OPERATOR) break;

            const opPrecedence = getOperatorPrecedence(token.value);
            if (opPrecedence <= precedence) break;

            current++; // consume operator
            const right = parseExpression(opPrecedence);

            left = {
                type: 'BinaryExpression',
                operator: token.value,
                left: left,
                right: right
            };
        }

        return left;
    }

    function parsePrimary() {
        const token = tokens[current];

        if (token.type === TokenType.NUMBER) {
            current++;
            return {
                type: 'Number',
                value: token.value
            };
        }

        if (token.type === TokenType.LPAREN) {
            current++; // consume '('
            const expr = parseExpression();
            current++; // consume ')'
            return expr;
        }

        if (token.type === TokenType.FUNCTION) {
            let node = {
                type: 'FunctionCall',
                name: token.value,
                arguments: []
            };

            current++; // move past function name
            current++; // move past left paren

            while (tokens[current].type !== TokenType.RPAREN) {
                if (tokens[current].type === TokenType.COMMA) {
                    current++;
                    continue;
                }
                node.arguments.push(parseExpression());
            }

            current++; // move past right paren
            return node;
        }

        throw new TypeError(`Unexpected token: ${token.type}`);
    }

    function getOperatorPrecedence(operator) {
        switch (operator) {
            case '+':
            case '-':
                return 1;
            case '*':
            case '/':
                return 2;
            default:
                return 0;
        }
    }

    return parseExpression();
}

// Function to generate AST (simplified version of parse tree)
function generateAST(parseTree) {
    if (!parseTree) return null;

    if (parseTree.type === 'Number') {
        return {
            type: 'Literal',
            value: parseTree.value
        };
    }

    if (parseTree.type === 'BinaryExpression') {
        return {
            type: 'BinaryExpression',
            operator: parseTree.operator,
            left: generateAST(parseTree.left),
            right: generateAST(parseTree.right)
        };
    }

    if (parseTree.type === 'FunctionCall') {
        return {
            type: 'FunctionCall',
            name: parseTree.name,
            arguments: parseTree.arguments.map(arg => generateAST(arg))
        };
    }

    return parseTree;
}

app.post('/parse', (req, res) => {
    try {
        const { expression } = req.body;
        const tokens = tokenize(expression);
        const parseTree = generateParseTree(tokens);
        const ast = generateAST(parseTree);
        
        res.json({
            parseTree,
            ast
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
