import { Router } from "express";
import * as score from "../controllers/score.controller";

const scoreRouter = Router({ mergeParams: true });

scoreRouter.get("/", score.getScoresOfChapter);
scoreRouter.post("/", score.createScore);
scoreRouter.put("/:scoreId", score.updateScore);
scoreRouter.delete("/:scoreId", score.deleteScore);
export default scoreRouter;
