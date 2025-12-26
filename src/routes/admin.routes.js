import { Router } from "express";
import * as adminCtrl from "../controllers/admin.controller.js";
import { auth } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/admin.js";
import uploadAvatar from "../utils/avatarUpload.js";

const r = Router();

r.get("/users", auth(), requireAdmin(), adminCtrl.listUsers);
r.get("/users/:id", auth(), requireAdmin(), adminCtrl.getUser);
r.patch("/users/:id", auth(), requireAdmin(), adminCtrl.updateUser);
r.post("/users/:id/promote", auth(), requireAdmin("super_admin"), adminCtrl.promoteToAdmin);
r.post("/users/:id/demote", auth(), requireAdmin("super_admin"), adminCtrl.demoteAdmin);
r.delete("/users/:id", auth(), requireAdmin("super_admin"), adminCtrl.deleteUser);
// upload avatar
r.post("/users/:id/avatar", auth(), requireAdmin(), uploadAvatar.single("avatar"), adminCtrl.uploadAvatar);

export default r;


