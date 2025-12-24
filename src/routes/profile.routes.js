import { Router } from "express";
import { updateProfile, uploadAvatar, createStudyPlan } from "../controllers/profile.controller.js";
import { auth } from "../middlewares/auth.js";

const r = Router();

// Update profile (cần authentication)
r.put("/", auth(true), uploadAvatar, updateProfile);
r.post("/study-plan", auth(true), createStudyPlan);

export default r;

