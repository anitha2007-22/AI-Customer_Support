const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getAllUsers, updateUser, deleteUser,
  getAgentPerformance, getSLAReport,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/agent-performance', getAgentPerformance);
router.get('/sla-report', getSLAReport);

module.exports = router;