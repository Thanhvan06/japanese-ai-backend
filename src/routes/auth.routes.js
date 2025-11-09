import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller.js";
import { auth } from "../middlewares/auth.js";

const r = Router();

r.post("/register", register);
r.post("/login", login);
r.get("/me", auth(true), me);

export default r;
