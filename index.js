require("dotenv").config();const express = require('express');
const exphbs = require('express-handlebars');
const axios = require("axios");
const cheerio = require("cheerio");
const pretty = require("pretty");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");
const { exit } = require("process");


// Get Season ID
const season = fs.readFileSync('./season.txt', {encoding:'utf8', flag:'r'}) || "2233030"; 

// Initialize URLs Array
const urls = [
    `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276507/276511`, // Amsterdam, Ankara
    `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276501/276502`, // Libson, London
    `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276503/276509`, // Athens, Cophagen
    `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276508/276516`, // Berlin, Bern
    `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276510/276505`, // Madrid, Moscow
    `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276512/276515`, // Paris, Prague
    `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276514/276513`, // Kiev, Rome
    `https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/${season}/h2h/276504/276506` // Vienna, Zagreb
];

// Initialize Express
const app = express();
const port =  process.env.PORT || 3000;

// Body Parser
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));

// Cors
app.use(cors());
app.options('*', cors());


app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});


// Initialize DB
var Schema = mongoose.Schema;
// Schema
var HistorySchema = new Schema({
    day: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    start: {
        type: Number,
        required:  true

    },
    end: {
        type: Number,
        required: true
    },
    profit: {
        type: Number,
        required: true
    }
}, { timestamps: true});

var History = mongoose.model("History", HistorySchema);
mongoose.connect(process.env.DB, { useNewUrlParser: true });
let historyQuery = History.find({});

// Dates
// Get Day and Date
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const d = new Date();
var day = days[d.getDay()];
var month = months[d.getMonth()];
var myDate = `${month}-${d.getFullYear()}`;

/* // Configure template Engine and Main Template File
app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs'
}));
// Setting template Engine
app.set('view engine', 'hbs');
 */

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


/******** Routes ************/
// Home
app.get('/home', async (req, res) => {
    try {
        // All records
        let gamesCount = await History.countDocuments({}).exec();

        // Get all Profit
        let allProfit = await History.aggregate([
            { $group: { _id: null, profit: { $sum: "$profit" } } }
        ]).exec();

        // Get The Month Profit
        let monthProfit = await History.aggregate([
            { $match: { date: myDate } },
            { $group: { _id: null, profit: { $sum: "$profit" } } }
        ]).exec();

        // Initialize Records
        var records = {
            games : gamesCount,
            allTotal: allProfit[0].profit,
            monthTotal: monthProfit[0].profit
        }
        return res.status(200).send({ 
            status: "success",
            data: records
        })
    } catch (err) {
        return res.status(400).send({ 
            status: "error",
            msg: err.message
        })
    }
});

app.post('/home', async (req, res) => {
    const { start, end } = req.body;
    // Validate Values Passed
    if(!start || !end || Number.isNaN(start) || Number.isNaN(end)) {
        return res.status(400).send({ 
            status: "error",
            msg: 'Invalid Payload Sent'
        })
    }
    
    // Create Payload
    let payload = {
        day: day, 
        date: myDate, 
        start: start, 
        end: end,
        profit: (end - start)
    }   
    // Save Data
    const myHistory = new History(payload);
    myHistory.save()
    .then((myHistory) => {
        return res.status(201).send({ 
            status: "success",
            msg: 'Record Added!',
            data: myHistory
        })
    })
    .catch((err) => {
        return res.status(400).send({ 
            status: "error",
            msg: err.message
        })
    })
});

// Games
app.get('/games', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
    );
    if(season) {
        let myGames = [];
        for(let i = 0;  i < 8; i++) {
            let data = await scrapeData(urls[i]);
            myGames.push(data);
        }
        return res.status(200).send({ 
            status: "success",
            data: myGames
        })
    } else {
        return res.status(400).send({ 
            status: "error",
            message: "Season ID is Invalid"
        })
    }
});

// Update Post
app.post('/games', async (req, res) => {
    const seasonId =  req.body.seasonID;

    if(!seasonId) return res.status(400).send({
        status: "error",
        message: "Invalid Payload Sent!"
    })

    fs.writeFile('season.txt', seasonId, function (err) {
        if (err) return res.status(400).send({
            status: "error",
            message: "Invalid Payload Sent!"
        })
        return res.status(201).send({
            status: "success",
            message: "Season Updated!"
        })
    });
});


// Games
app.get('/full', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
    );
    if(season) {
        let myGames = [];
        let matchNo;
        for(let i = 0;  i < 8; i++) {
            let data = await scrapeWinningData(urls[i], i);
            if(i == 0) matchNo = await data.matchNo;
            if(data.data1 != undefined) {
                myGames.push(data.data1);
            } 
            if(data.data2 != undefined) {
                myGames.push(data.data2);
            } 
        }
        return res.status(200).send({ 
            status: "success",
            data: myGames,
            match: matchNo
        })
    } else {
        return res.status(400).send({ 
            status: "error",
            message: "Season ID is Invalid"
        })
    }
});
''
// History
app.get('/history', async (req, res) => {
    // BASIC QUERY CHECK (page, limt per page, and  results sort)
    let pageNo = parseInt(req.query.page) || 0;
    let limit = 15; // set the default for Results per page
    let prevPage, nextPage;

    // Get all Records
    let totalCount = await History.countDocuments({}).exec();

    // Define Page No
    if(pageNo > 0) {
        pageNo = pageNo - 1;
    }

    // Check for Next and Prev
    // Check if there is a prev page
    if(pageNo > 0) {
        prevPage = pageNo - 1;
    }
    // Check if there is a next page
    if(totalCount > (limit * (pageNo + 1))) {
        nextPage = (pageNo == 0) ? pageNo + 2 : pageNo + 1;
    }

    // Fetch Results
    let allRecords = await historyQuery.sort({ createdAt: -1}).skip(pageNo * limit).limit(limit)
                    .clone().catch(function(err){ console.log(err)});
    if(allRecords.length) {
        return res.status(200).send({ 
            status: "success",
            prev: prevPage,
            next: nextPage,
            data: allRecords
        })
    } else {
        return res.status(200).send({ 
            status: "error",
            msg: 'No games history found!'
        })
    } 
});

// Async function which scrapes the data
async function scrapeData(url) {
    try {
        // Fetch HTML of the page we want to scrape
        const { data } = await axios.get(url);
        // Load HTML we fetched in the previous line
        const $ = cheerio.load(data,null, false);

        //////////////////////////// GET TEAM NAMES ////////////////////////////////////
        const teams =  $('#teambox > div.col-xs.flex-xs-no-grow.flex-xs-basis-auto.no-wrap.ie-fallback-width-65 > div > div.col-xs-12.no-wrap.cursor-pointer > div.hidden-xs-up.visible-sm-up > div > div.col-xs.flex-xs-no-grow.wrap > div.hidden-xs-up.visible-sm-up.size-l.no-wrap');

        // Initialize Team Array
        let teamArray = [];

        // Extract Teams
        teams.each(function (idx, team) {
            teamArray.push($(team).text());
        });
        // console.log(teamArray)

        //////////////////////////// GET TEAM RESULTS ////////////////////////////////////
        const results1 =  $('#sr-container > div > div > div.container.container-main.contair-full-height-flex-auto > div > div > div > div:nth-child(4) > div:nth-child(2) > div > div > div > div > div > div > div:nth-child(1) > table > tbody > tr > td.divide.text-center > div > div:nth-child(2) > div > div'); // For the First Team

        const results2 =  $('#sr-container > div > div > div.container.container-main.contair-full-height-flex-auto > div > div > div > div:nth-child(4) > div:nth-child(3) > div > div > div > div > div > div > div:nth-child(1) > table > tbody > tr > td.divide.text-center > div > div:nth-child(2) > div > div'); // For the Second Team

        // console.log(results1.text(), results2.text());

        
        let teamResult1 = (results1.text().split(" (FT)"));
        let teamResult2 = (results2.text().split(" (FT)"));

        // Remove the empty result string
        teamResult1.pop();
        teamResult2.pop();

        // Get Scores Outcome (Even/Odd)
        let teamStatus1 = parseScores(teamResult1);
        let teamStatus2 = parseScores(teamResult2);

        // console.log(teamStatus1, teamStatus2);

        //////////////////////////// CHECK FOR RUN ////////////////////////////////////
        var data1, data2;
        // Check run for team 1
        if(checkRun(teamStatus1)) {
            data1 = {
                status : true,
                teamName: teamArray[0],
                run: teamStatus1,
                url: url
            }
            // console.log(data1)
        } else {
            data1 = {
                status : false,
                teamName: teamArray[0],
                run: teamStatus1,
            }
            // console.log(data1)
        }
        // Check run for team 2
        if(checkRun(teamStatus2)) {
            data2 = {
                status : true,
                teamName: teamArray[1],
                run: teamStatus2,
                url: url
            }
            // console.log(data2)
        } else {
            data2 = {
                status : false,
                teamName: teamArray[1],
                run: teamStatus2,
            }
            // console.log(data2)
        }

        /////////////////// RETURN RESULTS //////////////////////////
        return {data1, data2};
    } catch (err) {
        console.error(err);
        return { err: err.message };
    }
}

// Async function which scrapes the data for teams on a run
async function scrapeWinningData(url, index = 1) {
    if(!url) return;
    // get team ids from urls
    let teams_ids = url.split('h2h/')[1].split("/");
    try {
        // Fetch HTML of the page we want to scrape
        const { data } = await axios.get(url);
        // Load HTML we fetched in the previous line
        const $ = cheerio.load(data,null, false);

        //////////////////////////// GET TEAM NAMES ////////////////////////////////////
        const teams =  $('#teambox > div.col-xs.flex-xs-no-grow.flex-xs-basis-auto.no-wrap.ie-fallback-width-65 > div > div.col-xs-12.no-wrap.cursor-pointer > div.hidden-xs-up.visible-sm-up > div > div.col-xs.flex-xs-no-grow.wrap > div.hidden-xs-up.visible-sm-up.size-l.no-wrap');

        // Initialize Team Array
        let teamArray = [];

        // Extract Teams
        teams.each(function (idx, team) {
            teamArray.push($(team).text());
        });
        // console.log(teamArray)

        //////////////////////////// GET TEAM RESULTS ////////////////////////////////////
        const results1 =  $('#sr-container > div > div > div.container.container-main.contair-full-height-flex-auto > div > div > div > div:nth-child(4) > div:nth-child(2) > div > div > div > div > div > div > div:nth-child(1) > table > tbody > tr > td.divide.text-center > div > div:nth-child(2) > div > div'); // For the First Team

        const results2 =  $('#sr-container > div > div > div.container.container-main.contair-full-height-flex-auto > div > div > div > div:nth-child(4) > div:nth-child(3) > div > div > div > div > div > div > div:nth-child(1) > table > tbody > tr > td.divide.text-center > div > div:nth-child(2) > div > div'); // For the Second Team
		
        // Get all Match Nos
		let matchNo;
		if(index < 1) {
			const matchNos =  $('#sr-container > div > div > div.container.container-main.contair-full-height-flex-auto > div > div > div > div:nth-child(4) > div:nth-child(2) > div > div > div > div > div > div > div > table > tbody > tr > td > span'); // For the Match Number
			matchNo = matchNos.text().split("VFLM");
			matchNo.shift();
		}

        
        let teamResult1 = (results1.text().split(" (FT)"));
        let teamResult2 = (results2.text().split(" (FT)"));

        // Remove the empty result string
        teamResult1.pop();
        teamResult2.pop();

        // Get Scores Outcome (Even/Odd)
        let teamStatus1 = parseScores(teamResult1);
        let teamStatus2 = parseScores(teamResult2);

        // console.log(teamStatus1, teamStatus2);

        //////////////////////////// CHECK FOR RUN ////////////////////////////////////
        var data1, data2;
        // Check run for team 1
        if(checkRun(teamStatus1)) {
            data1 = {
                status : true,
                teamName: teamArray[0],
                run: teamStatus1,
                url: url,
                teamID: teams_ids[0]
            }
            // console.log(data1)
        } else {
            data1 = undefined;
            // console.log(data1)
        }
        // Check run for team 2
        if(checkRun(teamStatus2)) {
            data2 = {
                status : true,
                teamName: teamArray[1],
                run: teamStatus2,
                url: url,
                teamID: teams_ids[1]
            }
            // console.log(data2)
        } else {
            data2 = undefined
        }

        /////////////////// RETURN RESULTS //////////////////////////
        return {data1, data2, matchNo};
    } catch (err) {
        console.error(err);
        return { err: err.message };
    }
}

// Server 
app.listen(port, () => {
    console.log('The web server has started on port 3000');
    if(port === 3000) {
        console.log("http://localhost:3000");
    }
});