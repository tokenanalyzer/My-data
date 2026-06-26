const puppeteer = require('puppeteer');
const ScrapedData = require('../models/ScrapedData');
const Job = require('../models/Job');

class IndiaMArtScraper {
  constructor() {
    this.browser = null;
    this.baseUrl = 'https://www.indiamart.com';
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ IndiaMART Scraper initialized');
  }

  async scrapeCompanies(query, limit = 100) {
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const searchUrl = `${this.baseUrl}/search.mp?SearchParam=${encodeURIComponent(query)}`;
      console.log(`🔍 Searching: ${searchUrl}`);
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for company listings
      await page.waitForSelector('div.dFlex', { timeout: 10000 }).catch(() => {});
      
      const companies = await page.evaluate(() => {
        const results = [];
        const listings = document.querySelectorAll('div[data-cid]');
        
        listings.forEach((listing) => {
          try {
            const name = listing.querySelector('h2')?.innerText?.trim() || '';
            const location = listing.querySelector('[data-qa="companyLocation"]')?.innerText?.trim() || '';
            const verified = listing.querySelector('[data-qa="isVerified"]') !== null;
            const responseRate = listing.querySelector('[data-qa="responseRate"]')?.innerText?.trim() || '';
            const link = listing.querySelector('a[href*="/sellers/"]')?.href || '';
            
            if (name) {
              results.push({
                companyName: name,
                location,
                verified,
                responseRate,
                profileUrl: link
              });
            }
          } catch (e) {
            console.error('Error parsing listing:', e);
          }
        });
        
        return results;
      });
      
      await page.close();
      console.log(`✅ Found ${companies.length} companies`);
      return companies;
    } catch (error) {
      console.error('❌ IndiaMART scraping error:', error);
      return [];
    }
  }

  async scrapeCompanyDetails(profileUrl) {
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const details = await page.evaluate(() => {
        return {
          email: document.querySelector('[data-qa="email"]')?.innerText?.trim() || '',
          phone: document.querySelector('[data-qa="phone"]')?.innerText?.trim() || '',
          website: document.querySelector('[data-qa="website"] a')?.href || '',
          industry: document.querySelector('[data-qa="industry"]')?.innerText?.trim() || '',
          gstNumber: document.querySelector('[data-qa="gst"]')?.innerText?.trim() || '',
          companySize: document.querySelector('[data-qa="employees"]')?.innerText?.trim() || ''
        };
      });
      
      await page.close();
      return details;
    } catch (error) {
      console.error('❌ Error scraping company details:', error);
      return {};
    }
  }

  async runJob(jobId, userId) {
    try {
      const job = await Job.findById(jobId);
      if (!job) throw new Error('Job not found');
      
      job.status = 'active';
      job.lastRun = new Date();
      job.nextRun = this.calculateNextRun(job.frequency);
      await job.save();
      
      const companies = await this.scrapeCompanies(job.query);
      job.totalRecords = companies.length;
      
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        const details = await this.scrapeCompanyDetails(company.profileUrl);
        
        await ScrapedData.create({
          userId,
          source: 'indiamart',
          companyName: company.companyName,
          phone: details.phone,
          email: details.email,
          website: details.website,
          industry: details.industry,
          location: company.location,
          gstNumber: details.gstNumber,
          companySize: details.companySize,
          jobId
        });
        
        job.processedRecords = i + 1;
        job.progress = Math.round((job.processedRecords / job.totalRecords) * 100);
        await job.save();
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      job.status = 'completed';
      await job.save();
      console.log(`✅ Job ${jobId} completed successfully`);
      
    } catch (error) {
      console.error('❌ Job execution error:', error);
      const job = await Job.findById(jobId);
      if (job) {
        job.status = 'failed';
        await job.save();
      }
    }
  }

  calculateNextRun(frequency) {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ IndiaMART Scraper closed');
    }
  }
}

module.exports = IndiaMArtScraper;