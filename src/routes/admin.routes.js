import { Router } from "express";
import * as adminCtrl from "../controllers/admin.controller.js";
import {
  listVocab,
  getVocab,
  createVocab,
  updateVocab,
  deleteVocab,
} from "../controllers/vocab.controller.js";
import {
  listGrammar,
  getGrammar,
  createGrammar,
  updateGrammar,
  togglePublishGrammar,
  deleteGrammar,
  listGrammarExercises,
  getGrammarExercise,
  createGrammarExercise,
  updateGrammarExercise,
  deleteGrammarExercise,
} from "../controllers/grammar.controller.js";
import { adminSearch } from "../controllers/search.controller.js";
import { auth } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/admin.js";
import uploadAvatar from "../utils/avatarUpload.js";

const r = Router();

r.get("/search", auth(), requireAdmin(), adminSearch);

r.get("/users", auth(), requireAdmin(), adminCtrl.listUsers);
r.get("/users/:id", auth(), requireAdmin(), adminCtrl.getUser);
r.patch("/users/:id", auth(), requireAdmin(), adminCtrl.updateUser);
r.post("/users/:id/promote", auth(), requireAdmin("super_admin"), adminCtrl.promoteToAdmin);
r.post("/users/:id/demote", auth(), requireAdmin("super_admin"), adminCtrl.demoteAdmin);
r.post("/users/:id/activate", auth(), requireAdmin(), adminCtrl.activateUser);
r.post("/users/:id/deactivate", auth(), requireAdmin(), adminCtrl.deactivateUser);
r.delete("/users/:id", auth(), requireAdmin("super_admin"), adminCtrl.deleteUser);
// upload avatar
r.post("/users/:id/avatar", auth(), requireAdmin(), uploadAvatar.single("avatar"), adminCtrl.uploadAvatar);

// Vocabulary CRUD
r.get("/vocab", auth(), requireAdmin(), listVocab);
r.get("/vocab/:id", auth(), requireAdmin(), getVocab);
r.post("/vocab", auth(), requireAdmin(), createVocab);
r.patch("/vocab/:id", auth(), requireAdmin(), updateVocab);
r.delete("/vocab/:id", auth(), requireAdmin(), deleteVocab);

// Grammar CRUD
r.get("/grammar", auth(), requireAdmin(), listGrammar);
r.get("/grammar/:id", auth(), requireAdmin(), getGrammar);
r.post("/grammar", auth(), requireAdmin(), createGrammar);
r.put("/grammar/:id", auth(), requireAdmin(), updateGrammar);
r.patch("/grammar/:id/publish", auth(), requireAdmin(), togglePublishGrammar);
r.delete("/grammar/:id", auth(), requireAdmin(), deleteGrammar);

// Grammar Exercises CRUD
r.get("/grammar-exercises", auth(), requireAdmin(), listGrammarExercises);
r.get("/grammar-exercises/:id", auth(), requireAdmin(), getGrammarExercise);
r.post("/grammar-exercises", auth(), requireAdmin(), createGrammarExercise);
r.put("/grammar-exercises/:id", auth(), requireAdmin(), updateGrammarExercise);
r.delete("/grammar-exercises/:id", auth(), requireAdmin(), deleteGrammarExercise);

export default r;


