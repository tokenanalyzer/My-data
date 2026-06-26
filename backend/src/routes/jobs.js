const express = require('express');
const router = express.Router();

const jobs = [
  {
    id: 'job_1',
    name: 'Daily IndiaMART Scrape',
    source: 'indiamart',
    frequency: 'daily',
    nextRun: new Date(Date.now() + 3600000).toISOString(),
    status: 'active',
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    recordsCollected: 250
  }
];

router.get('/', (req, res) => {
  res.json({ jobs });
});

router.post('/', (req, res) => {
  const { name, source, frequency } = req.body;
  
  const newJob = {
    id: 'job_' + Date.now(),
    name,
    source,
    frequency,
    nextRun: new Date(Date.now() + 3600000).toISOString(),
    status: 'active',
    lastRun: null,
    recordsCollected: 0
  };
  
  jobs.push(newJob);
  res.json({ success: true, job: newJob });
});

router.delete('/:id', (req, res) => {
  const index = jobs.findIndex(j => j.id === req.params.id);
  if (index > -1) {
    jobs.splice(index, 1);
    res.json({ success: true, message: 'Job deleted' });
  } else {
    res.status(404).json({ error: 'Job not found' });
  }
});

module.exports = router;