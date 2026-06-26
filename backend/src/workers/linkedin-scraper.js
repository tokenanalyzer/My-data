const puppeteer = require('puppeteer');
const ScrapedData = require('../models/ScrapedData');
const Job = require('../models/Job');

class LinkedInScraper {
  constructor(email, password) {
    this.browser = null;
    this.email = email;
    this.password = password;
    this.baseUrl = 'https://www.linkedin.com';
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('✅ LinkedIn Scraper initialized');
  }

  async login() {
    try {
      const page = await this.browser.newPage();
      await page.goto(`${this.baseUrl}/login`, { waitUntil: 'networkidle2' });
      
      // Enter email
      await page.type('input[name="session_key"]', this.email, { delay: 100 });
      await page.type('input[name="session_password"]', this.password, { delay: 100 });
      
      // Click login button
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
      console.log('✅ LinkedIn login successful');
      await page.close();
      return true;
    } catch (error) {
      console.error('❌ LinkedIn login error:', error);
      return false;
    }
  }

  async searchCompanies(query, limit = 100) {
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const searchUrl = `${this.baseUrl}/search/results/companies/?keywords=${encodeURIComponent(query)}`;
      console.log(`🔍 Searching LinkedIn Companies: ${searchUrl}`);
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for company results
      await page.waitForSelector('.base-search-card', { timeout: 10000 }).catch(() => {});
      
      const companies = await page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll('.base-search-card');
        
        cards.forEach((card) => {
          try {
            const name = card.querySelector('h3')?.innerText?.trim() || '';
            const tagline = card.querySelector('.base-search-card__subtitle')?.innerText?.trim() || '';
            const link = card.querySelector('a[href*="/company/"]')?.href || '';
            const description = card.querySelector('.entity-result__primary-subtitle')?.innerText?.trim() || '';
            
            if (name) {
              results.push({
                companyName: name,
                tagline,
                description,
                profileUrl: link
              });
            }
          } catch (e) {
            console.error('Error parsing company card:', e);
          }
        });
        
        return results;
      });
      
      await page.close();
      console.log(`✅ Found ${companies.length} companies on LinkedIn`);
      return companies;
    } catch (error) {
      console.error('❌ LinkedIn search error:', error);
      return [];
    }
  }

  async scrapeCompanyDetails(profileUrl) {
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Scroll to load all content
      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      
      const details = await page.evaluate(() => {
        return {
          companyName: document.querySelector('h1')?.innerText?.trim() || '',
          headline: document.querySelector('[class*="headline"]')?.innerText?.trim() || '',
          website: Array.from(document.querySelectorAll('a'))
            .find(a => a.href.includes('http') && !a.href.includes('linkedin'))?.href || '',
          industry: document.querySelector('[data-test-id*="industry"]')?.innerText?.trim() || '',
          companySize: document.querySelector('[data-test-id*="company-size"]')?.innerText?.trim() || '',
          location: document.querySelector('[data-test-id*="location"]')?.innerText?.trim() || '',
          foundedYear: document.querySelector('[data-test-id*="founded"]')?.innerText?.trim() || '',
          specialties: document.querySelector('[data-test-id*="specialties"]')?.innerText?.trim() || '',
          description: document.querySelector('[class*="description"]')?.innerText?.trim() || '',
          followersCount: document.querySelector('[data-test-id*="followers"]')?.innerText?.trim() || ''
        };
      });
      
      await page.close();
      return details;
    } catch (error) {
      console.error('❌ Error scraping LinkedIn company details:', error);
      return {};
    }
  }

  async searchPeople(keyword, company, limit = 50) {
    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      let searchUrl = `${this.baseUrl}/search/results/people/?keywords=${encodeURIComponent(keyword)}`;
      if (company) {
        searchUrl += `&company=${encodeURIComponent(company)}`;
      }
      
      console.log(`🔍 Searching LinkedIn People: ${searchUrl}`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const people = await page.evaluate(() => {
        const results = [];
        const cards = document.querySelectorAll('.base-search-card');
        
        cards.forEach((card) => {
          try {
            const name = card.querySelector('h3')?.innerText?.trim() || '';
            const title = card.querySelector('.base-search-card__subtitle')?.innerText?.trim() || '';
            const company = card.querySelector('[data-test-id*="company"]')?.innerText?.trim() || '';
            const location = card.querySelector('[data-test-id*="location"]')?.innerText?.trim() || '';
            const profileUrl = card.querySelector('a[href*="/in/"]')?.href || '';
            
            if (name) {
              results.push({
                name,
                title,
                company,
                location,
                profileUrl
              });
            }
          } catch (e) {
            console.error('Error parsing people card:', e);
          }
        });
        
        return results;
      });
      
      await page.close();
      console.log(`✅ Found ${people.length} people on LinkedIn`);
      return people;
    } catch (error) {
      console.error('❌ LinkedIn people search error:', error);
      return [];
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
      
      // Search for companies
      const companies = await this.searchCompanies(job.query);
      job.totalRecords = companies.length;
      
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        const details = await this.scrapeCompanyDetails(company.profileUrl);
        
        await ScrapedData.create({
          userId,
          source: 'linkedin',
          companyName: details.companyName || company.companyName,
          website: details.website,
          industry: details.industry,
          location: details.location,
          companySize: details.companySize,
          foundedYear: details.foundedYear ? parseInt(details.foundedYear) : null,
          linkedinUrl: company.profileUrl,
          jobId,
          metadata: {
            headline: details.headline,
            specialties: details.specialties,
            followers: details.followersCount
          }
        });
        
        job.processedRecords = i + 1;
        job.progress = Math.round((job.processedRecords / job.totalRecords) * 100);
        await job.save();
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      job.status = 'completed';
      await job.save();
      console.log(`✅ LinkedIn Job ${jobId} completed successfully`);
      
    } catch (error) {
      console.error('❌ LinkedIn Job execution error:', error);
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
      console.log('✅ LinkedIn Scraper closed');
    }
  }
}

module.exports = LinkedInScraper;