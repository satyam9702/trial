const expressionDisplay = document.getElementById('expression-display');
const resultDisplay = document.getElementById('result-display');
const buttonGrid = document.querySelector('.calculator__button-grid');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');
const angleToggle = document.getElementById('angle-toggle');
const memoryIndicator = document.getElementById('memory-indicator');

let expression = '';
let lastResult = 0;
let memoryValue = null;
let angleMode = 'RAD'; // or DEG

const E_SYMBOL = 'ℯ';
const PI_SYMBOL = 'π';

const context = {
    sin: value => Math.sin(convertAngleInput(value)),
    cos: value => Math.cos(convertAngleInput(value)),
    tan: value => Math.tan(convertAngleInput(value)),
    asin: value => convertAngleOutput(Math.asin(value)),
    acos: value => convertAngleOutput(Math.acos(value)),
    atan: value => convertAngleOutput(Math.atan(value)),
    sinh: value => Math.sinh(value),
    cosh: value => Math.cosh(value),
    tanh: value => Math.tanh(value),
    log: value => Math.log10(value),
    ln: value => Math.log(value),
    sqrt: value => Math.sqrt(value),
    cbrt: value => Math.cbrt(value),
    abs: value => Math.abs(value),
    exp: value => Math.exp(value),
    factorial: factorial,
    PI: Math.PI,
    E: Math.E,
};

function convertAngleInput(value) {
    return angleMode === 'DEG' ? (value * Math.PI) / 180 : value;
}

function convertAngleOutput(value) {
    return angleMode === 'DEG' ? (value * 180) / Math.PI : value;
}

function factorial(value) {
    if (!Number.isInteger(value) || value < 0) {
        throw new Error('Factorial is only defined for non-negative integers');
    }
    if (value > 170) {
        throw new Error('Result too large');
    }
    let product = 1;
    for (let i = 2; i <= value; i += 1) {
        product *= i;
    }
    return product;
}

function updateDisplay() {
    expressionDisplay.textContent = expression || '0';
}

function updateResultPreview() {
    if (!expression) {
        resultDisplay.textContent = '0';
        return;
    }

    try {
        const value = evaluateExpression(expression);
        if (Number.isFinite(value)) {
            resultDisplay.textContent = formatNumber(value);
        } else {
            resultDisplay.textContent = 'Error';
        }
    } catch (error) {
        resultDisplay.textContent = '…';
    }
}

function formatNumber(value) {
    if (Math.abs(value) >= 1e9 || (Math.abs(value) !== 0 && Math.abs(value) < 1e-6)) {
        return value.toExponential(6);
    }
    return parseFloat(value.toFixed(10)).toString();
}

function appendToExpression(value, options = {}) {
    if (options.implicitMultiplication && shouldInsertImplicitMultiplication(expression, value)) {
        expression = `${expression.trimEnd()} * `;
    }

    expression += value;
    updateDisplay();
    updateResultPreview();
}

function shouldInsertImplicitMultiplication(previousExpression, nextValue) {
    const previous = previousExpression.trimEnd();
    if (!previous) return false;

    const lastTokenMatch = previous.match(/(Ans|ℯ|π|!|\)|\d|\.)$/);
    if (!lastTokenMatch) return false;

    const startsWithNumber = /^[0-9]/.test(nextValue);
    const startsWithDot = nextValue.startsWith('.');
    const startsWithFunction = /^[a-z]/i.test(nextValue);
    const startsWithParenthesis = nextValue.startsWith('(');
    const isConstantSymbol = nextValue === PI_SYMBOL || nextValue === E_SYMBOL;
    const isAns = nextValue === 'Ans';

    return startsWithNumber || startsWithDot || startsWithFunction || startsWithParenthesis || isConstantSymbol || isAns;
}

function clearExpression() {
    expression = '';
    updateDisplay();
    updateResultPreview();
}

function deleteLastCharacter() {
    expression = expression.slice(0, -1);
    updateDisplay();
    updateResultPreview();
}

function extractFactorialOperand(input, bangIndex) {
    let start = bangIndex - 1;

    if (start < 0) {
        throw new Error('Invalid factorial usage');
    }

    if (input[start] === ')') {
        let depth = 1;
        start -= 1;
        while (start >= 0 && depth > 0) {
            const char = input[start];
            if (char === ')') {
                depth += 1;
            } else if (char === '(') {
                depth -= 1;
            }
            start -= 1;
        }
        if (depth !== 0) {
            throw new Error('Unbalanced parentheses in factorial');
        }
        start += 1;
        return {
            operand: input.slice(start, bangIndex),
            start,
            end: bangIndex + 1,
        };
    }

    while (start >= 0 && /[0-9A-Za-z_.πℯ]/.test(input[start])) {
        start -= 1;
    }
    start += 1;

    if (start === bangIndex) {
        throw new Error('Invalid factorial usage');
    }

    return {
        operand: input.slice(start, bangIndex),
        start,
        end: bangIndex + 1,
    };
}

function replaceFactorials(input) {
    let output = input;
    let index = output.indexOf('!');

    while (index !== -1) {
        const { operand, start, end } = extractFactorialOperand(output, index);
        output = `${output.slice(0, start)}factorial(${operand})${output.slice(end)}`;
        index = output.indexOf('!');
    }

    return output;
}

function extractPercentOperand(input, percentIndex) {
    let start = percentIndex - 1;

    if (start < 0) {
        throw new Error('Invalid percentage usage');
    }

    if (input[start] === ')') {
        let depth = 1;
        start -= 1;
        while (start >= 0 && depth > 0) {
            const char = input[start];
            if (char === ')') {
                depth += 1;
            } else if (char === '(') {
                depth -= 1;
            }
            start -= 1;
        }
        if (depth !== 0) {
            throw new Error('Unbalanced parentheses in percentage');
        }
        start += 1;
        return {
            operand: input.slice(start, percentIndex),
            start,
            end: percentIndex + 1,
        };
    }

    while (start >= 0 && /[0-9A-Za-z_.πℯ]/.test(input[start])) {
        start -= 1;
    }
    start += 1;

    if (start === percentIndex) {
        throw new Error('Invalid percentage usage');
    }

    return {
        operand: input.slice(start, percentIndex),
        start,
        end: percentIndex + 1,
    };
}

function replacePercentages(input) {
    let output = input;
    let index = output.indexOf('%');

    while (index !== -1) {
        const { operand, start, end } = extractPercentOperand(output, index);
        output = `${output.slice(0, start)}(${operand}/100)${output.slice(end)}`;
        index = output.indexOf('%');
    }

    return output;
}

function sanitizeExpression(rawExpression) {
    let sanitized = rawExpression;

    sanitized = sanitized.replace(/Ans/g, `(${lastResult})`);
    sanitized = sanitized.replace(new RegExp(PI_SYMBOL, 'g'), 'PI');
    sanitized = sanitized.replace(new RegExp(E_SYMBOL, 'g'), 'E');
    sanitized = sanitized.replace(/\^/g, '**');
    sanitized = replaceFactorials(sanitized);
    sanitized = replacePercentages(sanitized);

    const allowedCharacters = /^[0-9+\-*/().,%!\sA-Za-z_]*$/;
    if (!allowedCharacters.test(sanitized)) {
        throw new Error('Invalid characters detected');
    }

    const identifiers = sanitized.match(/[A-Za-z_]+/g) || [];
    const allowedIdentifiers = new Set([
        'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
        'sinh', 'cosh', 'tanh', 'log', 'ln', 'sqrt',
        'cbrt', 'abs', 'exp', 'factorial', 'PI', 'E', 'Math'
    ]);

    for (const identifier of identifiers) {
        if (!allowedIdentifiers.has(identifier)) {
            throw new Error(`Unsupported identifier: ${identifier}`);
        }
    }

    sanitized = sanitized.replace(/PI/g, 'Math.PI');
    sanitized = sanitized.replace(/E/g, 'Math.E');

    return sanitized;
}

function evaluateExpression(rawExpression) {
    const sanitized = sanitizeExpression(rawExpression);

    const evaluator = new Function('context', `with (context) { return ${sanitized}; }`);
    const result = evaluator(context);

    if (typeof result !== 'number' || Number.isNaN(result)) {
        throw new Error('Computation failed');
    }

    return result;
}

function handleButtonClick(event) {
    const target = event.target.closest('button');
    if (!target) return;

    const action = target.dataset.action;

    switch (action) {
        case 'value': {
            const value = target.dataset.value;
            const needsImplicit = value === '(' || value === 'Ans' || /^[0-9.]/.test(value);
            appendToExpression(value, { implicitMultiplication: needsImplicit });
            break;
        }
        case 'operator':
            appendToExpression(` ${target.dataset.value} `);
            break;
        case 'function':
            handleFunction(target.dataset.fn);
            break;
        case 'constant':
            handleConstant(target.dataset.constant);
            break;
        case 'clear':
            clearExpression();
            break;
        case 'delete':
            deleteLastCharacter();
            break;
        case 'equals':
            computeResult();
            break;
        case 'memory':
            handleMemory(target.dataset.memory);
            break;
        default:
            break;
    }
}

function handleFunction(fn) {
    if (fn === 'factorial') {
        appendToExpression('!');
        return;
    }

    appendToExpression(`${fn}(`, { implicitMultiplication: true });
}

function handleConstant(constant) {
    if (constant === 'pi') {
        appendToExpression(PI_SYMBOL, { implicitMultiplication: true });
    } else if (constant === 'e') {
        appendToExpression(E_SYMBOL, { implicitMultiplication: true });
    }
}

function computeResult() {
    if (!expression) return;

    try {
        const value = evaluateExpression(expression);
        lastResult = value;
        resultDisplay.textContent = formatNumber(value);
        addToHistory(expression, value);
        expression = formatNumber(value);
        updateDisplay();
    } catch (error) {
        resultDisplay.textContent = error.message;
    }
}

function addToHistory(expr, value) {
    const item = document.createElement('li');
    item.className = 'history__item';
    item.tabIndex = 0;

    const expressionEl = document.createElement('div');
    expressionEl.className = 'history__expression';
    expressionEl.textContent = expr;

    const resultEl = document.createElement('div');
    resultEl.className = 'history__result';
    resultEl.textContent = formatNumber(value);

    item.appendChild(expressionEl);
    item.appendChild(resultEl);

    item.addEventListener('click', () => {
        expression = expr;
        updateDisplay();
        updateResultPreview();
    });

    item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            expression = expr;
            updateDisplay();
            updateResultPreview();
        }
    });

    historyList.prepend(item);
}

function handleMemory(action) {
    switch (action) {
        case 'clear':
            memoryValue = null;
            updateMemoryIndicator();
            break;
        case 'recall':
            if (memoryValue !== null) {
                const value = formatNumber(memoryValue);
                const formatted = memoryValue < 0 ? `(${value})` : value;
                appendToExpression(formatted, { implicitMultiplication: true });
            }
            break;
        case 'add':
            updateMemoryValue(lastResult, 1);
            break;
        case 'subtract':
            updateMemoryValue(lastResult, -1);
            break;
        default:
            break;
    }
}

function updateMemoryValue(amount, multiplier) {
    if (typeof amount !== 'number' || Number.isNaN(amount)) return;
    if (memoryValue === null) {
        memoryValue = 0;
    }
    memoryValue += amount * multiplier;
    updateMemoryIndicator();
}

function updateMemoryIndicator() {
    const hasMemory = memoryValue !== null;
    memoryIndicator.classList.toggle('memory-indicator--active', hasMemory);
    memoryIndicator.textContent = hasMemory ? 'M' : '–';
}

function clearHistory() {
    historyList.innerHTML = '';
}

function toggleAngleMode() {
    angleMode = angleMode === 'RAD' ? 'DEG' : 'RAD';
    angleToggle.textContent = `Mode: ${angleMode}`;
    angleToggle.setAttribute('aria-pressed', angleMode === 'DEG' ? 'true' : 'false');
    updateResultPreview();
}

function handleKeyboardInput(event) {
    if (event.defaultPrevented) return;

    const { key } = event;

    if (/^[0-9.]$/.test(key)) {
        appendToExpression(key, { implicitMultiplication: true });
        return;
    }

    if (['+', '-', '*', '/', '^'].includes(key)) {
        appendToExpression(` ${key} `);
        return;
    }

    if (key === '%') {
        appendToExpression('%');
        return;
    }

    if (key === 'Enter' || key === '=') {
        event.preventDefault();
        computeResult();
        return;
    }

    if (key === 'Backspace') {
        deleteLastCharacter();
        return;
    }

    if (key === 'Delete') {
        clearExpression();
        return;
    }

    if (key === '(') {
        appendToExpression('(', { implicitMultiplication: true });
        return;
    }

    if (key === ')') {
        appendToExpression(')');
    }
}

buttonGrid.addEventListener('click', handleButtonClick);
clearHistoryBtn.addEventListener('click', clearHistory);
angleToggle.addEventListener('click', toggleAngleMode);
window.addEventListener('keydown', handleKeyboardInput);

updateDisplay();
updateResultPreview();
updateMemoryIndicator();
