import { Router } from "express";
import { register, login, me, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import { auth } from "../middlewares/auth.js";

const r = Router();

r.post("/register", register);
r.post("/login", login);
r.get("/me", auth(true), me);
r.post("/forgot-password", forgotPassword);
r.post("/reset-password", resetPassword);

export default r;
