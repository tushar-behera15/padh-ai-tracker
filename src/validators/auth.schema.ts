import { z } from "zod";

export const registerSchema = z.object({
    name: z.string({ error: "Name is required" }).min(2, "Name too short"),
    email: z.email("A valid email is reqired"),
    password: z.string("Password is required").min(6, "Password must be at least 6 chars")
});

export const loginSchema = z.object({
    email: z.email("A valid email is reqired"),
    password: z.string("Password is required").min(6)
});
