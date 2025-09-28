// Minimal ADK-like shim so we don't need any external package.
export class Task {
    constructor(name, runImpl) { this.name = name; this.runImpl = runImpl; }
    async run(input, ctx) { return this.runImpl(input, ctx); }
  }
  
  export class Plan {
    constructor(name, steps = []) { this.name = name; this.steps = steps; }
    async run(input, ctx) {
      let cur = input;
      for (const step of this.steps) cur = await step.run(cur, ctx);
      return cur;
    }
  }
  