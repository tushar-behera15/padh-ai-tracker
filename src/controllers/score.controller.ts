import { Request, Response } from "express";
import db from "../utils/db";
import { verifyToken } from "../utils/jwt";
import { getAIRevisionStrategy } from "../services/aiRevisionStrategy";
import { buildRevisionDates } from "../services/revisionScheduler";
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
            ` 
            SELECT
            COUNT(*) FILTER (WHERE sc.performance_level = 'weak') AS weak,
            COUNT(*) FILTER (WHERE sc.performance_level = 'average') AS average,
            COUNT(*) FILTER (WHERE sc.performance_level = 'strong') AS strong,
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
    const client = await db.getClient(); // pg Pool client
    try {
        await client.query("BEGIN");

        const token = req.cookies?.token;
        if (!token) {
            await client.query("ROLLBACK");
            return res.status(401).json({ message: "Unauthorized" });
        }

        const decoded = verifyToken(token) as { userId: string };

        const { score_percentage, deadline } = req.body;
        if (score_percentage === undefined || !deadline) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "score_percentage & deadline are required",
            });
        }

        const { chapterId } = req.params;

        // Verify chapter ownership
        const chapterRes = await client.query(
            `
            SELECT ch.id
            FROM chapters ch
            JOIN subjects s ON ch.subject_id = s.id
            WHERE ch.id = $1 AND s.user_id = $2
            `,
            [chapterId, decoded.userId]
        );

        if (chapterRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Chapter not found" });
        }

        // 🔥 DELETE OLD REVISIONS FIRST (FK SAFE)
        await client.query(
            `
            DELETE FROM revisions
            WHERE score_id IN (
                SELECT id FROM scores WHERE chapter_id = $1
            )
            `,
            [chapterId]
        );

        // 🔥 DELETE OLD SCORE
        await client.query(
            `DELETE FROM scores WHERE chapter_id = $1`,
            [chapterId]
        );

        // Performance level
        let performance_level: "weak" | "average" | "strong";
        if (score_percentage < 40) performance_level = "weak";
        else if (score_percentage < 70) performance_level = "average";
        else performance_level = "strong";

        // 🔥 INSERT NEW SCORE (SAME CLIENT)
        const scoreRes = await client.query(
            `
            INSERT INTO scores
            (chapter_id, score_percentage, performance_level, deadline)
            VALUES ($1, $2, $3, $4)
            RETURNING id
            `,
            [chapterId, score_percentage, performance_level, deadline]
        );

        const scoreId = scoreRes.rows[0].id;

        // -------- AI PART --------
        const daysLeft = Math.ceil(
            (new Date(deadline).getTime() - Date.now()) / 86400000
        );

        const aiStrategy = await getAIRevisionStrategy(
            score_percentage,
            daysLeft
        );

        const revisionDates = buildRevisionDates(
            aiStrategy,
            deadline
        );
        // ------------------------

        // 🔥 INSERT REVISIONS (SAME CLIENT)
        for (const date of revisionDates) {
            await client.query(
                `
                INSERT INTO revisions (score_id, revision_date)
                VALUES ($1, $2)
                `,
                [scoreId, date]
            );
        }

        await client.query("COMMIT");

        return res.status(201).json({
            message: "Score created & AI scheduled revisions",
            scoreId,
            performance_level,
            ai_strategy: aiStrategy,
            revision_plan: revisionDates,
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error(error);
        return res.status(500).json({
            message: "Failed to create score",
        });
    } finally {
        client.release();
    }
}






export async function updateScore(req: Request, res: Response) {
    const client = await db.getClient();
    try {
        await client.query("BEGIN");

        const token = req.cookies?.token;
        if (!token) {
            await client.query("ROLLBACK");
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { scoreId } = req.params;
        const { score_percentage, deadline } = req.body;

        if (score_percentage === undefined || !deadline) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "score_percentage and deadline are required",
            });
        }

        const { userId } = verifyToken(token) as { userId: string };

        // Determine performance
        let performance_level: "weak" | "average" | "strong";
        if (score_percentage < 40) performance_level = "weak";
        else if (score_percentage < 70) performance_level = "average";
        else performance_level = "strong";

        // 🔥 Update score with ownership check
        const scoreRes = await client.query<{
            id: string;
            chapter_id: string;
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
            RETURNING sc.id, sc.chapter_id
            `,
            [score_percentage, performance_level, deadline, scoreId, userId]
        );

        if (scoreRes.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Score not found" });
        }

        const updatedScoreId = scoreRes.rows[0].id;

        // 🔥 Delete old revisions (FK safe)
        await client.query(
            `DELETE FROM revisions WHERE score_id = $1`,
            [updatedScoreId]
        );

        // -------- AI PART --------
        const daysLeft = Math.ceil(
            (new Date(deadline).getTime() - Date.now()) / 86400000
        );

        let aiStrategy;
        try {
            aiStrategy = await getAIRevisionStrategy(
                score_percentage,
                daysLeft
            );
        } catch {
            // Fallback if AI fails
            aiStrategy = {
                revision_count: 2,
                initial_gap: 3,
                gap_multiplier: 1.6,
            };
        }

        const revisionDates = buildRevisionDates(
            aiStrategy,
            deadline
        );
        // ------------------------

        // 🔥 Insert new revisions
        for (const date of revisionDates) {
            await client.query(
                `
                INSERT INTO revisions (score_id, revision_date)
                VALUES ($1, $2)
                `,
                [updatedScoreId, date]
            );
        }

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Score & revisions updated successfully",
            scoreId: updatedScoreId,
            performance_level,
            ai_strategy: aiStrategy,
            revision_plan: revisionDates,
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("updateScore error:", err);
        return res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release();
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


