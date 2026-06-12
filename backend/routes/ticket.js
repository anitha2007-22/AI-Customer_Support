const express = require('express');
const router = express.Router();
const {
  createTicket, getTickets, getTicket, updateTicket,
  addMessage, assignTicket, getAISuggestion, rateTicket, deleteTicket,
} = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(protect, getTickets)
  .post(protect, upload.array('attachments', 5), createTicket);

router.route('/:id')
  .get(protect, getTicket)
  .put(protect, updateTicket)
  .delete(protect, authorize('admin'), deleteTicket);

router.post('/:id/messages', protect, upload.array('attachments', 5), addMessage);
router.put('/:id/assign', protect, authorize('admin'), assignTicket);
router.get('/:id/ai-suggestion', protect, authorize('agent', 'admin'), getAISuggestion);
router.put('/:id/rate', protect, authorize('customer'), rateTicket);

module.exports = router;