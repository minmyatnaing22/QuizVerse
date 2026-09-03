const express = require("express");

const router = express.Router();

const userController = require("../controllers/userController");

router.post("/register", userController.register);

router.post("/login", userController.login);

router.get("/google-config", userController.googleConfig);

router.post("/google-login", userController.loginWithGoogle);

router.post("/session", userController.restoreSession);

router.get("/me", userController.getCurrentUser);

router.put("/profile", userController.updateProfile);

router.put("/password", userController.changePassword);

router.put("/preferences", userController.updatePreferences);

module.exports = router;
