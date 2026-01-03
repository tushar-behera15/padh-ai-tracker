import { Request, Response } from "express";
import db from "../utils/db";
import { verifyToken } from "../utils/jwt";

export async function markRevisionCompleted(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { revisionId } = req.params;
        const { userId } = verifyToken(token) as { userId: string };

        const revisions = await db.query<{
            id: string;
            completed: boolean;
        }>(
            `
      UPDATE revisions r
      SET completed = true
      FROM scores sc
      JOIN chapters ch ON sc.chapter_id = ch.id
      JOIN subjects s ON ch.subject_id = s.id
      WHERE r.id = $1
        AND r.score_id = sc.id
        AND s.user_id = $2
      RETURNING r.id, r.completed
      `,
            [revisionId, userId]
        );

        if (revisions.length === 0) {
            return res.status(404).json({ message: "Revision not found" });
        }

        return res.status(200).json({
            message: "Revision marked as completed",
            revision: revisions[0]
        });

    } catch (err) {
        console.error("markRevisionCompleted error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function getRevisions(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { date } = req.query;
        const { userId } = verifyToken(token) as { userId: string };
        // 📅 If date is provided → date-wise revisions
        if (date) {
            const revisions = await db.query<{
                id: string;
                revision_date: string;
                completed: boolean;
                chapter_name: string;
                subject_name: string;
            }>(
                `
        SELECT
          r.id,
          r.revision_date,
          r.completed,
          ch.name AS chapter_name,
          s.name  AS subject_name
        FROM revisions r
        JOIN scores sc ON r.score_id = sc.id
        JOIN chapters ch ON sc.chapter_id = ch.id
        JOIN subjects s ON ch.subject_id = s.id
        WHERE s.user_id = $1
          AND r.revision_date::date = $2::date
        ORDER BY ch.name
        `,
                [userId, date]
            );

            return res.status(200).json({
                message: "Revisions fetched successfully",
                revisions
            });
        }

        // 📋 Otherwise → all revisions (dashboard view)
        const revisions = await db.query<{
            id: string;
            revision_date: string;
            completed: boolean;
            chapter_name: string;
            subject_name: string;
        }>(
            `
      SELECT
        r.id,
        r.revision_date,
        r.completed,
        ch.name AS chapter_name,
        s.name  AS subject_name
      FROM revisions r
      JOIN scores sc ON r.score_id = sc.id
      JOIN chapters ch ON sc.chapter_id = ch.id
      JOIN subjects s ON ch.subject_id = s.id
      WHERE s.user_id = $1
      ORDER BY r.revision_date ASC
      `,
            [userId]
        );

        return res.status(200).json({
            message: "Revisions fetched successfully",
            revisions
        });

    } catch (err) {
        console.error("getRevisions error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}


