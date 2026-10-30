export interface SkillFormulaContext {
  variable: (name: string) => number;
  reference: (kind: string, name: string, field: string) => number;
}

type Node = (context: SkillFormulaContext) => number;
const cache = new Map<string, Node>();

// Interpret the numeric game-table language. Never execute table text as JavaScript.
export function evaluateSkillFormula(
  value: unknown,
  context: SkillFormulaContext
): number {
  if (value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const expression = String(value);
  if (expression.length > 2048) throw new Error("Skill formula is too long");
  let root = cache.get(expression);
  if (!root) {
    const tokens: string[] = [];
    const lexer =
      /\s*(?:\d+(?:\.\d+)?|'[^']*'|[a-z_]\w*|==|!=|<=|>=|&&|\|\||[+\-*/%(),.?:<>!])/giy;
    let offset = 0;
    while (offset < expression.trimEnd().length) {
      lexer.lastIndex = offset;
      const match = lexer.exec(expression);
      if (!match || tokens.length > 512) throw new Error("Unsupported skill formula");
      tokens.push(match[0].trim());
      offset = lexer.lastIndex;
    }
    let cursor = 0;
    const take = () => tokens[cursor++];
    const expect = (token: string) => {
      if (take() !== token) throw new Error("Invalid skill formula");
    };
    const precedence = [
      ["||"],
      ["&&"],
      ["==", "!=", "<", ">", "<=", ">="],
      ["+", "-"],
      ["*", "/", "%"],
    ];
    const expressionNode = (): Node => {
      const condition = binary(0);
      if (tokens[cursor] !== "?") return condition;
      take();
      const yes = expressionNode();
      expect(":");
      const no = expressionNode();
      return (ctx) => (condition(ctx) ? yes(ctx) : no(ctx));
    };
    const atom = (): Node => {
      const token = take();
      if (token === "(") {
        const result = expressionNode();
        expect(")");
        return result;
      }
      if (["+", "-", "!"].includes(token)) {
        const child = atom();
        return (ctx) =>
          token === "-" ? -child(ctx) : token === "!" ? Number(!child(ctx)) : child(ctx);
      }
      if (/^\d/.test(token ?? "")) return () => Number(token);
      if (!/^[a-z_]\w*$/i.test(token ?? "")) throw new Error("Invalid formula token");
      if (tokens[cursor] !== "(") return (ctx) => ctx.variable(token.toLowerCase());
      take();
      if (token === "skill" || token === "stat") {
        const name = take();
        if (!name?.startsWith("'")) throw new Error("Invalid formula reference");
        expect(".");
        const field = take();
        expect(")");
        return (ctx) => ctx.reference(token, name.slice(1, -1), field.toLowerCase());
      }
      const args = [expressionNode()];
      while (tokens[cursor] === ",") {
        take();
        args.push(expressionNode());
      }
      expect(")");
      const functions: Record<string, (...args: number[]) => number> = {
        min: Math.min,
        max: Math.max,
        abs: Math.abs,
        floor: Math.floor,
        ceil: Math.ceil,
      };
      if (!functions[token]) throw new Error("Unsupported formula function");
      return (ctx) => functions[token](...args.map((arg) => arg(ctx)));
    };
    const binary = (level: number): Node => {
      if (level === precedence.length) return atom();
      let left = binary(level + 1);
      while (precedence[level].includes(tokens[cursor])) {
        const operator = take(),
          previous = left,
          right = binary(level + 1);
        left = (ctx) => {
          const a = previous(ctx);
          if (operator === "&&") return Number(!!a && !!right(ctx));
          if (operator === "||") return Number(!!a || !!right(ctx));
          const b = right(ctx);
          switch (operator) {
            case "+":
              return a + b;
            case "-":
              return a - b;
            case "*":
              return a * b;
            case "/":
              if (!b) throw new Error("Division by zero");
              return Math.trunc(a / b);
            case "%":
              if (!b) throw new Error("Division by zero");
              return a % b;
            case "==":
              return Number(a === b);
            case "!=":
              return Number(a !== b);
            case "<":
              return Number(a < b);
            case ">":
              return Number(a > b);
            case "<=":
              return Number(a <= b);
            case ">=":
              return Number(a >= b);
            default:
              throw new Error("Unsupported formula operator");
          }
        };
      }
      return left;
    };
    root = expressionNode();
    if (cursor !== tokens.length) throw new Error("Unexpected formula token");
    if (cache.size > 1000) cache.clear();
    cache.set(expression, root);
  }
  const result = root(context);
  if (!Number.isFinite(result)) throw new Error("Invalid formula result");
  return result;
}
