import { Router } from "express";
import * as revision from "../controllers/revision.controller";

const revisionRounter = Router();

revisionRounter.get("/", revision.getRevisions);

revisionRounter.put("/:revisionId/completed", revision.markRevisionCompleted);

export default revisionRounter;
