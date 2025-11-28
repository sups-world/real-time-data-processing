import { Router } from "express";
import { createQueue } from "../lib/queue.js";
import ProcessedRecord from "../models/ProcessedRecord.js";
import Aggregate from "../models/Aggregate.js";
const router = Router();

const QUEUE = createQueue();

// Expected payload: { items: [{ value: number, type?: string, meta?: {} }, ...] }
// We'll add minimal validation.
router.post("/ingest", async (req, res) => {
  try {
    const items = req.body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }

    // prepare jobs for addBulk for performance under high-throughput
    const jobs = items.map((item) => ({
      name: "process-data",
      // data: item,
      data: { ...item, key: req.body.key || "global" },
      opts: {
        attempts: 3,
        backoff: { type: "exponential", delay: 500 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }));

    // addBulk returns a promise that resolves once jobs are accepted by Redis (fast)
    await QUEUE.addBulk(jobs);

    // respond immediately — ingestion is asynchronous
    return res.status(202).json({ accepted: items.length });
  } catch (err) {
    console.error("Ingest error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/data/history
 * Query Params:
 *  - page (default 1)
 *  - limit (default 20)
 *  - from (ISO time)
 *  - to   (ISO time)
 */
router.get("/history", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const filter = {};

    // Date filtering
    if (req.query.from) {
      filter.processedAt = { $gte: new Date(req.query.from) };
    }
    if (req.query.to) {
      filter.processedAt = {
        ...filter.processedAt,
        $lte: new Date(req.query.to),
      };
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      ProcessedRecord.find(filter)
        .sort({ processedAt: -1 })
        .skip(skip)
        .limit(limit),
      ProcessedRecord.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: records,
    });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ success: false, error: "Failed to fetch history" });
  }
});

export default router;
