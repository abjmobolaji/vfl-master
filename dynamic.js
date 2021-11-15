    // Dynammic Pages Using Puppeteer
    
    const cheerio = require('cheerio');
    const puppeteer = require('puppeteer');
    const fs = require('fs');
	
	process.setMaxListeners(0);

    // Get Season ID
    const season = fs.readFileSync('./season.txt', {encoding:'utf8', flag:'r'}) || "2233030"; 
    
    /* // Initialize Teams Name
    const teams = {
       276501 : "VFL Libson", 276505 : "VFL Moscow", 276509 : "VFL Copehagen", 276513 : "VFL Rome",
       276502 : "VFL London", 276506 : "VFL Zagreb", 276510 : "VFL Madrid", 276514 : "VFL Kiev",
       276503 : "VFL Anthens", 276507 : "VFL Amsterdam", 276511 : "VFL Ankara", 276515 : "VFL Prague",
       276504 : "VFL Vienna", 276508 : "VFL Berlin", 276512 : "VFL Paris", 276516 : "VFL Bern"
    } */
    // Initialize Teams Name Array
    const teams = [
      "VFL Libson", "VFL London", "VFL Anthens", "VFL Vienna", 
      "VFL Moscow", "VFL Zagreb", "VFL Amsterdam", "VFL Berlin", 
      "VFL Copehagen", "VFL Madrid", "VFL Ankara", "VFL Paris",
      "VFL Rome", "VFL Kiev", "VFL Prague", "VFL Bern"
    ]
    // Initialize URLs Array
    const urls = [
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276501/276511`,  
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276502/276508`, 
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276504/276516`,
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276505/276505`, 
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276506/276515`, 
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276507/276513`, 
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276508/276506`,
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276509/276511`,  
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276510/276502`, 
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276511/276509`, 
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276512/276516`, 
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276513/276505`, 
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276514/276516`,
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276515/276514`, 
      `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276516/276506`
    ];
    const url = 'https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/2233030/h2h/276507/276511';

	/******** Functions ************/
	// Parse Scores
	function parseScores(scores) {
		let result = [];
		scores.forEach((el, index) => {
			let scoreArray = el.split(":");
			let finalScore = Number(scoreArray[0]) + Number(scoreArray[1]);
			(finalScore % 2 === 0) ? result.push("Even") : result.push("Odd");
		})
		return result;
	}

	// Check Run
	const checkRun = arr => arr.every( v => v === arr[0] )
    


	async function startScrape(url) {
		if(!url) return;
		puppeteer
		.launch()
		.then(browser => browser.newPage())
		.then(page => {
			return page.goto(url).then(async function() {
				await page.click('#sr-container > div > div > div.container.container-main.contair-full-height-flex-auto > div > div > div > div:nth-child(4) > div:nth-child(2) > div > div > div > div > div > div > div.col-xs-12.text-center.margin-top-medium > button')
				return page.content();
			});
		})
		.then(html => {
			const $ = cheerio.load(html);
	
			const results1 =  $('#sr-container > div > div > div.container.container-main.contair-full-height-flex-auto > div > div > div > div:nth-child(4) > div:nth-child(2) > div > div > div > div > div > div > div:nth-child(1) > table > tbody > tr > td.divide.text-center > div > div:nth-child(2) > div > div'); // For the First Team
			let teamResult1 = (results1.text().split(" (FT)"));
			teamResult1.pop();
			console.log(teamResult1);
  
		  /* // Write countries array in countries.json file
		  fs.writeFile("fils.txt", JSON.stringify(teamResult1), (err) => {
			if (err) {
			  console.error(err);
			  return;
			}
			console.log("Successfully written data to file");
		  }); */
		})
		.catch(console.error);
	}
	async function start() {
		for(let i = 0;  i < 5; i++) {
			await startScrape(urls[i]);
		}
	}
	start()
	
// #teambox > div.col-xs.flex-xs-no-grow.flex-xs-basis-auto.no-wrap.ie-fallback-width-65 > div > div.col-xs-12.no-wrap.cursor-pointer > div.hidden-xs-up.visible-sm-up > div > div.col-xs.flex-xs-no-grow.wrap > div.hidden-xs-up.visible-sm-up.size-l.no-wrap