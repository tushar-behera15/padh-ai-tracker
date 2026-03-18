import jwt from "jsonwebtoken";


export const signToken = (payload: object) =>
    jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: process.env.JWT_EXPIRES_IN as any });

export const verifyToken = (token: string) =>
    jwt.verify(token, process.env.JWT_SECRET!);
