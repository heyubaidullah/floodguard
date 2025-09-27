import type { Task, MessagePart } from '@dexwox-labs/a2a-core';

export class ResultAggregator {
  private readonly task: Task;
  private readonly parts: MessagePart[] = [];
  private isComplete = false;

  constructor(task: Task) {
    this.task = task;
  }

  addPart(part: MessagePart): void {
    if (this.isComplete) {
      throw new Error('Cannot add parts to completed aggregation');
    }
    this.parts.push(part);
  }

  complete(): void {
    this.isComplete = true;
  }

  getResult(): MessagePart[] {
    if (!this.isComplete) {
      throw new Error('Aggregation not yet complete');
    }
    return [...this.parts];
  }

  getTask(): Task {
    return {...this.task};
  }

  getProgress(): number {
    if (this.isComplete) return 1;
    return this.task.expectedParts 
      ? this.parts.length / this.task.expectedParts
      : 0;
  }
}
