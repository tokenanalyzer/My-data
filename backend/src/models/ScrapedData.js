const mongoose = require('mongoose');

const scrapedDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  source: {
    type: String,
    enum: ['indiamart', 'tradekey', 'linkedin', 'custom'],
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  phone: String,
  email: String,
  website: String,
  industry: String,
  location: String,
  contactPerson: String,
  designation: String,
  companySize: String,
  foundedYear: Number,
  revenue: String,
  linkedinUrl: String,
  gstNumber: String,
  panNumber: String,
  metadata: mongoose.Schema.Types.Mixed,
  jobId: String,
  status: {
    type: String,
    enum: ['pending', 'verified', 'invalid'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
scrapedDataSchema.index({ userId: 1, source: 1 });
scrapedDataSchema.index({ companyName: 'text', email: 'text' });

module.exports = mongoose.model('ScrapedData', scrapedDataSchema);