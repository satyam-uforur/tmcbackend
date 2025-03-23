import express from "express";
import { VercelRequest, VercelResponse } from "@vercel/node"; 

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "API is working!" });
});

export default (req, res) => app(req, res);
