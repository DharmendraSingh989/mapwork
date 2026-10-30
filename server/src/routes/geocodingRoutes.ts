import { Router, Request, Response } from "express";
import { searchGeocoding } from "../services/geocodingService.js";

const router = Router();

router.get("/search", async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query) {
    res.json([]);
    return;
  }
  const results = await searchGeocoding(query);
  res.json(results);
});

export default router;
