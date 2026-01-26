import { Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../utils/db";
import { signToken, verifyToken } from "../utils/jwt";
export async function register(req: Request, res: Response) {

    const { name, email, password } = req.body;
    const hashedPass = await bcrypt.hash(password, 10);
    const existingUser = await db.query("SELECT id FROM users WHERE email=$1", [email]);
    if (existingUser.length > 0) {
        return res.status(409).json({ message: "Email already exists.." });
    }
    const newUser = await db.query<{ id: string; name: string; email: string; password: string }>("INSERT INTO users(name,email,password) VALUES ($1,$2,$3) RETURNING id,name,email", [name, email, hashedPass]);
    const user = newUser[0];
    const token = signToken({ userId: user.id });
    const { password: _password, ...safeUser } = user;
    return res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    }).status(201).json({ message: "User Created Succesfully", user: safeUser });
}


export async function login(req: Request, res: Response) {
    const { email, password } = req.body;

    const users = await db.query<{
        id: string;
        name: string;
        email: string;
        password: string;
    }>(
        "SELECT id, name, email, password FROM users WHERE email = $1",
        [email]
    );

    if (users.length === 0) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const user = users[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = signToken({ userId: user.id });

    const { password: _password, ...safeUser } = user;

    // 6️⃣ Send cookie + response
    return res
        .cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })
        .status(200)
        .json({
            message: "Login successful",
            user: safeUser
        });
}

export async function logout(req: Request, res: Response) {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    })
    return res.status(200).json({ message: "Logout Successfully" });
}

export async function me(req: Request, res: Response) {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ user: null });
        const decoded = verifyToken(token) as { userId: string };
        const user = await db.query<{ id: string, name: string, email: string }>("SELECT id,name,email FROM users WHERE id=$1", [decoded.userId]);
        if (user.length === 0) {
            return res.status(404).json({ user: null });
        }
        return res.status(200).json({ user: user[0] });
    } catch (err) {
        return res.status(401).json({ user: null });
    }
}
