const mongoose = require('mongoose');

class BatchUpdateProcessor {
  constructor(model, batchSize = 100, intervalMs = 5000) {
    this.model = model;
    this.batchSize = batchSize;
    this.intervalMs = intervalMs;
    this.queue = [];
    this.timer = null;
  }

  enqueue(update) {
    this.queue.push(update);
    if (!this.timer) {
      this.startTimer();
    }
  }

  startTimer() {
    this.timer = setTimeout(async () => {
      await this.processBatch();
      if (this.queue.length > 0) {
        this.startTimer();
      } else {
        this.timer = null;
      }
    }, this.intervalMs);
  }

  async processBatch() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
const bulkOps = batch.map(update => ({
  updateOne: {
    filter: { _id: new mongoose.Types.ObjectId(update.id) },
    update: update.data,
    upsert: true,
  }
}));

    try {
      const result = await this.model.bulkWrite(bulkOps);
      console.log('Batch update processed:', result);
    } catch (error) {
      console.error('Error processing batch update:', error);
      // Optionally re-enqueue failed batch or handle errors accordingly
    }
  }
}

module.exports = BatchUpdateProcessor;
