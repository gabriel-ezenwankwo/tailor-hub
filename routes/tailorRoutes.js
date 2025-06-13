const express = require('express');
const authController = require('../controllers/authController');
const tailorController = require('../controllers/tailorController');

const router = express.Router();

// Public routes
router.get('/catalogs', tailorController.getPublicCatalogs);

// Protected routes - requires authentication
router.use(authController.protect);

// Routes only for tailors and admins
router.use(authController.restrictTo('tailor', 'admin'));
router.post('/catalogs', tailorController.createCatalog);
router.patch('/catalogs/:id', tailorController.updateCatalog);
router.delete('/catalogs/:id', tailorController.deleteCatalog);

// Routes only for admins
router.use(authController.restrictTo('admin'));
router.get('/stats', tailorController.getTailorStats);

module.exports = router;
