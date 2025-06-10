const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'TailorHub API is running',
    timestamp: new Date()
  });
});

module.exports = router;