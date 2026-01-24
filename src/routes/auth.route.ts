import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { validateRequest } from "../middleware/validate.middleware";
import { loginSchema, registerSchema } from "../validators/auth.schema";
const authRouter = Router();

authRouter.post("/register", validateRequest(registerSchema), auth.register);
authRouter.post("/login", validateRequest(loginSchema), auth.login);
authRouter.get("/logout", auth.logout);
authRouter.get("/me", auth.me);
export default authRouter;