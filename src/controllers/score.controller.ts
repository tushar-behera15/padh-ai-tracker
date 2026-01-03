import { Request, Response } from "express";
import db from "../utils/db";
import { verifyToken } from "../utils/jwt";
export async function getScores(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { subjectId } = req.params;
        const { userId } = verifyToken(token) as { userId: string };

        const summary = await db.query<{
            weak: number;
            average: number;
            strong: number;
            average_percentage: number | null;
        }>(
            `SELECT
  COUNT(*) FILTER (WHERE sc.performance_level = 'weak')    AS weak,
  COUNT(*) FILTER (WHERE sc.performance_level = 'average') AS average,
  COUNT(*) FILTER (WHERE sc.performance_level = 'strong')  AS strong,
  ROUND(AVG(sc.score_percentage), 2) AS average_percentage
FROM scores sc
JOIN chapters ch ON sc.chapter_id = ch.id
JOIN subjects s ON ch.subject_id = s.id
WHERE s.id = $1
  AND s.user_id = $2;
      `,
            [subjectId, userId]
        );

        return res.status(200).json({
            message: "Subject score summary fetched successfully",
            summary: summary[0]
        });

    } catch (err) {
        console.error("getScores error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function getScoresOfChapter(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { chapterId } = req.params;
        const { userId } = verifyToken(token) as { userId: string };

        const scores = await db.query<{
            id: string;
            score_percentage: number;
            performance_level: "weak" | "average" | "strong";
            deadline: string;
            created_at: string;
            chapter_id: string;
            chapter_name: string;
        }>(
            `SELECT
        sc.id,
        sc.score_percentage,
        sc.performance_level,
        sc.deadline,
        sc.created_at,
        ch.id   AS chapter_id,
        ch.name AS chapter_name
      FROM scores sc
      JOIN chapters ch ON sc.chapter_id = ch.id
      JOIN subjects s ON ch.subject_id = s.id
      WHERE ch.id = $1
        AND s.user_id = $2
      ORDER BY sc.created_at DESC
      `,
            [chapterId, userId]
        );

        return res.status(200).json({
            message: "Chapter Scores fetched successfully",
            scores
        });

    } catch (err) {
        console.error("getScores of Chapter error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}


export async function createScore(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { score_percentage, deadline } = req.body;
        if (score_percentage == undefined || !deadline) {
            return res.status(400).json({ message: "Score_percentage & deadline field is required" });
        }
        const { chapterId } = req.params;
        const decoded = verifyToken(token) as { userId: string };
        const chapters = await db.query<{ id: string }>("SELECT ch.id FROM chapters ch JOIN subjects s ON ch.subject_id = s.id WHERE ch.id=$1 AND s.user_id=$2", [chapterId, decoded.userId])
        if (chapters.length === 0) {
            return res.status(404).json({ message: "Chapter not found" });
        }
        let performance_level: "weak" | "average" | "strong";

        if (score_percentage < 40) {
            performance_level = "weak";
        } else if (score_percentage < 70) {
            performance_level = "average";
        } else {
            performance_level = "strong";
        }


        // Score query
        const scores = await db.query<{ id: string; chapter_id: string; score_percentage: number; performance_level: string; deadline: string; created_at: string; }>("INSERT INTO scores (chapter_id,score_percentage,performance_level,deadline) VALUES ($1,$2,$3,$4) RETURNING *", [chapterId, score_percentage, performance_level, deadline]);

        // Caculate the revision date
        function calculateRevisionDate(
            performance: "weak" | "average" | "strong"
        ): string {
            const today = new Date();

            if (performance === "weak") today.setDate(today.getDate() + 2);
            else if (performance === "average") today.setDate(today.getDate() + 4);
            else today.setDate(today.getDate() + 7);

            return today.toISOString().split("T")[0]; // YYYY-MM-DD
        }
        const revision_date = calculateRevisionDate(performance_level);

        await db.query(
            `INSERT INTO revisions (score_id, revision_date) VALUES ($1, $2)`,
            [scores[0].id, revision_date]
        );

        return res.status(201).json({
            message: "Score created and revision scheduled automatically",
            scoreId: scores[0].id,
            performance_level,
            revision_date
        });
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}


export async function updateScore(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { scoreId } = req.params;
        const { score_percentage, deadline } = req.body;

        if (score_percentage === undefined || !deadline) {
            return res.status(400).json({
                message: "score_percentage and deadline are required"
            });
        }

        const { userId } = verifyToken(token) as { userId: string };

        let performance_level: "weak" | "average" | "strong";
        if (score_percentage < 40) performance_level = "weak";
        else if (score_percentage < 70) performance_level = "average";
        else performance_level = "strong";

        const scores = await db.query<{
            id: string;
            chapter_id: string;
            score_percentage: number;
            performance_level: string;
            deadline: string;
        }>(
            `
      UPDATE scores sc
      SET
        score_percentage = $1,
        performance_level = $2,
        deadline = $3
      FROM chapters ch
      JOIN subjects s ON ch.subject_id = s.id
      WHERE sc.id = $4
        AND sc.chapter_id = ch.id
        AND s.user_id = $5
      RETURNING
        sc.id,
        sc.chapter_id,
        sc.score_percentage,
        sc.performance_level,
        sc.deadline
      `,
            [score_percentage, performance_level, deadline, scoreId, userId]
        );

        if (scores.length === 0) {
            return res.status(404).json({ message: "Score not found" });
        }

        return res.status(200).json({
            message: "Score updated successfully",
            score: scores[0]
        });

    } catch (err) {
        console.error("updateScore error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function deleteScore(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { scoreId } = req.params;
        const { userId } = verifyToken(token) as { userId: string };

        const scores = await db.query<{
            id: string;
            chapter_id: string;
        }>(
            `
      DELETE FROM scores sc
      USING chapters ch, subjects s
      WHERE sc.id = $1
        AND sc.chapter_id = ch.id
        AND ch.subject_id = s.id
        AND s.user_id = $2
      RETURNING sc.id, sc.chapter_id
      `,
            [scoreId, userId]
        );

        if (scores.length === 0) {
            return res.status(404).json({ message: "Score not found" });
        }

        return res.status(200).json({
            message: "Score deleted successfully",
            score: scores[0]
        });

    } catch (err) {
        console.error("deleteScore error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}


