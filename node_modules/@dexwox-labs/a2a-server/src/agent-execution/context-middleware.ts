import { Request, Response, NextFunction } from 'express';
import { Task } from '@dexwox-labs/a2a-core';
import { createRequestContext, runInContext } from './request-context';

export function contextMiddleware(agentId: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Create a basic task for the request
    const task: Task = {
      id: crypto.randomUUID(),
      name: `${req.method} ${req.path}`,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create and run the request in context
    const context = createRequestContext(task, agentId);
    runInContext(context, () => next());
  };
}
