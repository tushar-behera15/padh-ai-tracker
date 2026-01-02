import { Request, Response } from "express";
import db from "../utils/db";
import { verifyToken } from "../utils/jwt";
export async function getChapters(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { subjectId } = req.params;
        const decoded = verifyToken(token) as { userId: string };
        const chapters = await db.query<{ id: string; name: string }>("SELECT c.id,c.name FROM chapters c JOIN subjects s ON c.subject_id = s.id WHERE c.subject_id = $1 AND s.user_id = $2", [subjectId, decoded.userId]);
        return res.status(200).json({ message: "Chapters fetched successfully", chapters });
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

export async function createChapter(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Field name is required" });
        }
        const { subjectId } = req.params;
        const decoded = verifyToken(token) as { userId: string };
        const subjects = await db.query("SELECT id FROM subjects WHERE id=$1 AND user_id=$2", [subjectId, decoded.userId]);
        if (subjects.length === 0) {
            return res.status(404).json({ message: "Chapter not found" });
        }
        const chapters = await db.query<{ id: string; name: string; user_id: string }>("INSERT INTO chapters(name,subject_id) VALUES($1,$2) RETURNING id,name,subject_id", [name, subjectId]);

        return res.status(201).json({ message: "Chapter created successfully", subject: chapters[0] });
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}


export async function updateChapter(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { name } = req.body;
        const { chapterId } = req.params;

        if (!name) {
            return res.status(400).json({ message: "Chapter name is required" });
        }

        const { userId } = verifyToken(token) as { userId: string };

        const chapters = await db.query<{
            id: string;
            name: string;
            subject_id: string;
        }>(
            `
      UPDATE chapters c
      SET name = $1
      FROM subjects s
      WHERE c.id = $2
        AND c.subject_id = s.id
        AND s.user_id = $3
      RETURNING c.id, c.name, c.subject_id
      `,
            [name, chapterId, userId]
        );

        if (chapters.length === 0) {
            return res.status(404).json({ message: "Chapter not found" });
        }

        return res.status(200).json({
            message: "Chapter updated successfully",
            chapter: chapters[0]
        });

    } catch (err) {
        console.error("updateChapter error:", err);

        return res.status(500).json({ message: "Internal server error" });
    }
}



export async function deleteChapter(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { chapterId } = req.params;
        const { userId } = verifyToken(token) as { userId: string };

        const chapters = await db.query<{
            id: string;
            subject_id: string;
        }>(
            `DELETE FROM chapters c USING subjects s WHERE c.id = $1 AND c.subject_id = s.id AND s.user_id = $2 RETURNING c.id, c.subject_id`,
            [chapterId, userId]
        );

        if (chapters.length === 0) {
            return res.status(404).json({ message: "Chapter not found" });
        }

        return res.status(200).json({
            message: "Chapter deleted successfully",
            chapter: chapters[0]
        });

    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

