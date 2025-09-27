import { EventQueue } from './event-queue';
import { QueueManager, QueueStats } from '../queue-system/queue-manager';
import { A2AError } from '@dexwox-labs/a2a-core';

export class EventConsumer {
  private queue!: EventQueue; // Definite assignment assertion
  private isRunning = false;
  private stats!: QueueStats; // Definite assignment assertion 
  private processingTimes: number[] = [];

  constructor(
    private readonly taskId: string,
    private readonly queueManager: QueueManager & { updateStats(taskId: string, updates: Partial<QueueStats>): Promise<void> },
    private readonly handler: (event: unknown) => Promise<void>
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const tappedQueue = await this.queueManager.tap(this.taskId);
    this.queue = tappedQueue;
    this.stats = await this.queueManager.getStats(this.taskId);

    while (this.isRunning) {
      try {
        const startTime = Date.now();
        const event = await tappedQueue.dequeue();

        if (event === undefined) { // Check for queue end
          break;
        }

        await this.handler(event);
        
        const processingTime = Date.now() - startTime;
        this.processingTimes.push(processingTime);
        this.updateStats({
          processed: this.stats.processed + 1,
          throughput: this.calculateThroughput(),
          avgProcessingTime: this.calculateAvgProcessingTime()
        });
      } catch (error) {
        this.updateStats({
          failed: this.stats.failed + 1,
          errorRate: this.stats.failed / (this.stats.processed + this.stats.failed)
        });
        throw error;
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    await this.queue.close();
  }

  private updateStats(updates: Partial<QueueStats>): void {
    Object.assign(this.stats, updates);
    this.queueManager.updateStats(this.taskId, this.stats);
  }

  private calculateThroughput(): number {
    // Calculate events per second over last 10 events
    const windowSize = Math.min(10, this.processingTimes.length);
    if (windowSize === 0) return 0;
    
    const window = this.processingTimes.slice(-windowSize);
    const totalTime = window.reduce((sum, time) => sum + time, 0);
    return windowSize / (totalTime / 1000);
  }

  private calculateAvgProcessingTime(): number {
    if (this.processingTimes.length === 0) return 0;
    return this.processingTimes.reduce((sum, time) => sum + time, 0) / 
           this.processingTimes.length;
  }
}
