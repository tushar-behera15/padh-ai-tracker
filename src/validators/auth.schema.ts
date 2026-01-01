import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().min(2, "Name too short"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 chars")
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6)
});
