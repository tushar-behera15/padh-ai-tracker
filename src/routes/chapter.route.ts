import { Router } from "express";
import * as chapter from '../controllers/chapter.controller';
const chapterRouter = Router({ mergeParams: true });
chapterRouter.get("/", chapter.getChapters);
chapterRouter.post("/", chapter.createChapter);
chapterRouter.put("/:chapterId", chapter.updateChapter);
chapterRouter.delete("/:chapterId", chapter.deleteChapter);
export default chapterRouter;