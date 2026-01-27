import { Request, Response, NextFunction } from "express";
import z, { ZodSchema } from "zod";

export const validateRequest = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ errors: z.treeifyError(result.error) });
        }
        req.body = result.data;
        next();
        return
    };
};
