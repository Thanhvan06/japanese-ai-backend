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
import * as readingAdmin from "../controllers/readingAdmin.controller.js";
import * as adminProgress from "../controllers/adminProgress.controller.js";
import { auth } from "../middlewares/auth.js";
import { requireAdmin } from "../middlewares/admin.js";
import uploadAvatar from "../utils/avatarUpload.js";

const r = Router();

r.get("/search", auth(), requireAdmin(), adminSearch);

r.get("/users", auth(), requireAdmin(), adminCtrl.listUsers);
r.get("/users/:id", auth(), requireAdmin(), adminCtrl.getUser);
r.patch("/users/:id", auth(), requireAdmin(), adminCtrl.updateUser);
r.get("/audit", auth(), requireAdmin(), adminCtrl.listAdminAudit);
r.post("/users/:id/promote", auth(), requireAdmin(), adminCtrl.promoteToAdmin);
r.post("/users/:id/demote", auth(), requireAdmin(), adminCtrl.demoteAdmin);
r.post("/users/:id/activate", auth(), requireAdmin(), adminCtrl.activateUser);
r.post("/users/:id/deactivate", auth(), requireAdmin(), adminCtrl.deactivateUser);
r.delete("/users/:id", auth(), requireAdmin(), adminCtrl.deleteUser);
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

// Reading Sets CRUD
r.get("/reading/sets", auth(), requireAdmin(), readingAdmin.listReadingSetsAdmin);
r.post("/reading/sets", auth(), requireAdmin(), readingAdmin.createReadingSetAdmin);
r.put("/reading/sets/:id", auth(), requireAdmin(), readingAdmin.updateReadingSetAdmin);
r.patch(
  "/reading/sets/:id/publish",
  auth(),
  requireAdmin(),
  readingAdmin.togglePublishReadingSetAdmin
);
r.delete("/reading/sets/:id", auth(), requireAdmin(), readingAdmin.deleteReadingSetAdmin);

// Reading Items CRUD
r.get("/reading/items", auth(), requireAdmin(), readingAdmin.listReadingItemsAdmin);
r.get("/reading/items/:id", auth(), requireAdmin(), readingAdmin.getReadingItemAdmin);
r.post("/reading/items", auth(), requireAdmin(), readingAdmin.createReadingItemAdmin);
r.put("/reading/items/:id", auth(), requireAdmin(), readingAdmin.updateReadingItemAdmin);
r.delete("/reading/items/:id", auth(), requireAdmin(), readingAdmin.deleteReadingItemAdmin);

r.get(
  "/progress/user/:userId",
  auth(),
  requireAdmin(),
  adminProgress.getAdminUserPracticeProgress
);

export default r;


