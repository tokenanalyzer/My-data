const puppeteer = require('puppeteer');
const ScrapedData = require('../models/ScrapedData');
const Job = require('../models/Job');

class TradeKeyScraper {
  constructor() {
    this.browser = null;
    this.baseUrl = 'https://www.tradekey.com';
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ TradeKey Scraper initialized');
  }

  async searchSuppliers(query, limit = 100) {
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const searchUrl = `${this.baseUrl}/s/${encodeURIComponent(query)}.html`;
      console.log(`🔍 Searching TradeKey: ${searchUrl}`);
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for supplier listings
      await page.waitForSelector('.supplier-item', { timeout: 10000 }).catch(() => {});
      
      const suppliers = await page.evaluate(() => {
        const results = [];
        const items = document.querySelectorAll('.supplier-item, [data-supplier-id]');
        
        items.forEach((item) => {
          try {
            const name = item.querySelector('.supplier-name, .company-name')?.innerText?.trim() || '';
            const country = item.querySelector('.country, [data-country]')?.innerText?.trim() || '';
            const verified = item.querySelector('[data-verified], .verified-badge') !== null;
            const responseTime = item.querySelector('.response-time')?.innerText?.trim() || '';
            const profileLink = item.querySelector('a[href*="/supplier/"]')?.href || '';
            
            if (name) {
              results.push({
                companyName: name,
                location: country,
                verified,
                responseTime,
                profileUrl: profileLink
              });
            }
          } catch (e) {
            console.error('Error parsing supplier item:', e);
          }
        });
        
        return results;
      });
      
      await page.close();
      console.log(`✅ Found ${suppliers.length} suppliers on TradeKey`);
      return suppliers;
    } catch (error) {
      console.error('❌ TradeKey search error:', error);
      return [];
    }
  }

  async scrapeSupplierDetails(profileUrl) {
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const details = await page.evaluate(() => {
        return {
          companyName: document.querySelector('.company-title, h1')?.innerText?.trim() || '',
          email: document.querySelector('[data-email], .company-email')?.innerText?.trim() || '',
          phone: document.querySelector('[data-phone], .company-phone')?.innerText?.trim() || '',
          website: document.querySelector('a[href*="http"][href*="."]')?.href || '',
          address: document.querySelector('.company-address, [data-address]')?.innerText?.trim() || '',
          businessType: document.querySelector('[data-business-type]')?.innerText?.trim() || '',
          yearEstablished: document.querySelector('[data-year]')?.innerText?.trim() || '',
          employees: document.querySelector('[data-employees]')?.innerText?.trim() || '',
          revenue: document.querySelector('[data-revenue]')?.innerText?.trim() || ''
        };
      });
      
      await page.close();
      return details;
    } catch (error) {
      console.error('❌ Error scraping TradeKey supplier details:', error);
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
      
      const suppliers = await this.searchSuppliers(job.query);
      job.totalRecords = suppliers.length;
      
      for (let i = 0; i < suppliers.length; i++) {
        const supplier = suppliers[i];
        const details = await this.scrapeSupplierDetails(supplier.profileUrl);
        
        await ScrapedData.create({
          userId,
          source: 'tradekey',
          companyName: details.companyName || supplier.companyName,
          phone: details.phone,
          email: details.email,
          website: details.website,
          location: supplier.location || details.address,
          companySize: details.employees,
          revenue: details.revenue,
          foundedYear: details.yearEstablished ? parseInt(details.yearEstablished) : null,
          jobId,
          metadata: {
            businessType: details.businessType,
            responseTime: supplier.responseTime,
            verified: supplier.verified
          }
        });
        
        job.processedRecords = i + 1;
        job.progress = Math.round((job.processedRecords / job.totalRecords) * 100);
        await job.save();
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      job.status = 'completed';
      await job.save();
      console.log(`✅ TradeKey Job ${jobId} completed successfully`);
      
    } catch (error) {
      console.error('❌ TradeKey Job execution error:', error);
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
      console.log('✅ TradeKey Scraper closed');
    }
  }
}

module.exports = TradeKeyScraper;