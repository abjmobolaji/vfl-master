    // Dynammic Pages Using Puppeteer
    
    const cheerio = require('cheerio');
    const puppeteer = require('puppeteer');
    
    const url = 'https://www.reddit.com/r/news/';
    
    puppeteer
      .launch()
      .then(browser => browser.newPage())
      .then(page => {
        return page.goto(url).then(function() {
          return page.content();
        });
      })
      .then(html => {
        const $ = cheerio.load(html);
        const newsHeadlines = [];
        $('a[href*="/r/news/comments"] > h2').each(function() {
          newsHeadlines.push({
            title: $(this).text(),
          });
        });
    
        console.log(newsHeadlines);
      })
      .catch(console.error);
// #teambox > div.col-xs.flex-xs-no-grow.flex-xs-basis-auto.no-wrap.ie-fallback-width-65 > div > div.col-xs-12.no-wrap.cursor-pointer > div.hidden-xs-up.visible-sm-up > div > div.col-xs.flex-xs-no-grow.wrap > div.hidden-xs-up.visible-sm-up.size-l.no-wrap