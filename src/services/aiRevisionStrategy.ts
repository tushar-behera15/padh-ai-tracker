import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY as string
);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
});

function extractJson(text: string) {
    return JSON.parse(
        text.replace(/```json/g, "")
            .replace(/```/g, "")
            .trim()
    );
}

export async function getAIRevisionStrategy(
    score: number,
    daysLeft: number
) {
    const prompt = `
You are a study-planning AI.

Inputs:
score_percentage: ${score}
days_left: ${daysLeft}

Return ONLY valid JSON (no explanation, no markdown):

{
  "revision_count": number,
  "initial_gap": number,
  "gap_multiplier": number
}

Rules:
- Lower score = more revisions
- Lower score = smaller initial_gap
- revision_count <= days_left
- gap_multiplier between 1.4 and 2.2
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
        return extractJson(text);
    } catch (err) {
        console.error("Gemini raw output:", text);
        throw new Error("Gemini returned invalid JSON");
    }
}
