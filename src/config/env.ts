import dotenv from "dotenv";
dotenv.config();
export const ENV = {
    PORT: process.env.PORT || 4000,
    NODE_ENV: process.env.NODE_ENV || "development",
    JWT_SECRET: process.env.JWT_SECRET || "219c161deb321249a11dd3653f63654e0277c9c0a895c371f28933770d2a696e295391f16b6b329251218e0f4df12c2ce7b33f13458dcc86020d0406af1b9d3d",
    JWT_EXPIRES_IN: "7d"
};
