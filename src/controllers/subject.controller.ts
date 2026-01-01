import { Request, Response } from "express";
import db from "../utils/db";
import { verifyToken } from "../utils/jwt";
export async function getSubjects(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const decoded = verifyToken(token) as { userId: string };
        const subjects = await db.query<{ id: string; name: string }>("SELECT id,name FROM subjects WHERE user_id=$1", [decoded.userId]);
        return res.status(200).json({ message: "Subject fetched successfully", subjects });
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
export async function createSubject(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Field name is required" });
        }
        const decoded = verifyToken(token) as { userId: string };
        const subjects = await db.query<{ id: string; name: string; user_id: string }>("INSERT INTO subjects(name,user_id) VALUES ($1,$2) RETURNING id,name,user_id", [name, decoded.userId]);
        return res.status(201).json({ message: "Subject created successfully", subject: subjects[0] });
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
export async function updateSubject(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { name } = req.body;
        const { id: subjectId } = req.params;
        if (!name) {
            return res.status(400).json({ message: "Field name is required" });
        }
        const decoded = verifyToken(token) as { userId: string };
        const subjects = await db.query<{ id: string; name: string; user_id: string }>("UPDATE subjects SET name=$1  WHERE id = $2 AND user_id = $3 RETURNING id,name,user_id", [name, subjectId, decoded.userId]);
        if (subjects.length == 0) {
            return res.status(404).json({ message: "Subject not found" });
        }
        return res.status(200).json({ message: "Subject Updated successfully", subject: subjects[0] });
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
export async function deleteSubject(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { id: subjectId } = req.params;
        const decoded = verifyToken(token) as { userId: string };
        const subjects = await db.query<{ id: string; user_id: string }>("DELETE FROM subjects WHERE id=$1 AND user_id=$2 RETURNING id,user_id", [subjectId, decoded.userId]);
        if (subjects.length === 0) {
            return res.status(404).json({ message: "Subject not found" });
        }
        return res.status(200).json({ message: "Subject Deleted successfully", subject: subjects[0] });
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
