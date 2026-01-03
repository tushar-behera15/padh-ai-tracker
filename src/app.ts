import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import authRouter from "./routes/auth.route";
import subjectRouter from "./routes/subject.route";
import revisionRounter from "./routes/revision.route";

const app = express();
app.use(helmet());
app.use(cors({
    origin: "localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter);
app.use("/api/subject", subjectRouter);
app.use("/api/revision", revisionRounter);
export default app;
