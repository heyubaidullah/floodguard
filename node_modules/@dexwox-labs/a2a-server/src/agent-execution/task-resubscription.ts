import { RequestContext } from './request-context';
import { EventQueue } from './event-queue';
import { TaskManager } from '../tasks/task-manager';
import { DefaultRequestHandler } from '../request-handler';

export class TaskResubscriptionHandler {
  private readonly requestHandler = new DefaultRequestHandler();
  
  constructor(private taskManager: TaskManager) {}

  /**
   * Handle task resubscription request
   * @param context Request context
   * @param queue Event queue for streaming updates
   */
  async *handleResubscription(
    context: RequestContext,
    queue: EventQueue
  ): AsyncGenerator<any, void, unknown> {
    const task = await this.taskManager.getTask(context.task.id);
    if (!task) {
      throw this.requestHandler.normalizeError({ code: -32004, message: 'Task not found' });
    }
    
    // First yield existing task parts
    for (const part of task.parts || []) {
      yield part;
    }

    // Use the queue's built-in dequeue method
    while (task.status === 'working') {
      const event = await queue.dequeue();
      if (event) {
        yield event;
      }
    }
  }
}
