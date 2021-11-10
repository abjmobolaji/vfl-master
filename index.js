require("dotenv").config();const express = require('express');
const exphbs = require('express-handlebars');
const axios = require("axios");
const cheerio = require("cheerio");
const pretty = require("pretty");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");
const { exit } = require("process");


// Initialize URLs Array
const urls = [

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
app.get('/gamesFiles', async (req, res) => {
    res.render('home', { msg: 'This is home page'});
});

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


// URL of the page we want to scrape
const url = "https://s5.sir.sportradar.com/bet9javirtuals/en/1/season/2228578/h2h/276501/276502";



// Async function which scrapes the data
async function scrapeData(url) {
  try {
    // Fetch HTML of the page we want to scrape
    const { data } = await axios.get(url);
    // Load HTML we fetched in the previous line
    const $ = cheerio.load(data,null, false);
    // Select all the list items in plainlist class
    const listItems = $("table").text();


    //////////////////////////// GET TEAM NAMES ////////////////////////////////////
    const teams =  $('#teambox > div.col-xs.flex-xs-no-grow.flex-xs-basis-auto.no-wrap.ie-fallback-width-65 > div > div.col-xs-12.no-wrap.cursor-pointer > div.hidden-xs-up.visible-sm-up > div > div.col-xs.flex-xs-no-grow.wrap > div.hidden-xs-up.visible-sm-up.size-l.no-wrap');

    // Initialize Team Array
    let teamArray = [];

    // Extract Teams
    teams.each(function (idx, team) {
        teamArray.push($(team).text());
      });
    console.log(teamArray)

    //////////////////////////// GET TEAM RESULTS ////////////////////////////////////
    const results1 =  $('#sr-container > div > div > div.container.container-main.contair-full-height-flex-auto > div > div > div > div:nth-child(4) > div:nth-child(2) > div > div > div > div > div > div > div:nth-child(1) > table > tbody > tr > td.divide.text-center > div > div:nth-child(2) > div > div'); // For the First Team

    const results2 =  $('#sr-container > div > div > div.container.container-main.contair-full-height-flex-auto > div > div > div > div:nth-child(4) > div:nth-child(3) > div > div > div > div > div > div > div:nth-child(1) > table > tbody > tr > td.divide.text-center > div > div:nth-child(2) > div > div'); // For the Second Team

    console.log(results1.text(), results2.text());

    
    let teamResult1 = (results1.text().split(" (FT)"));
    let teamResult2 = (results2.text().split(" (FT)"));

    // Remove the empty result string
    teamResult1.pop();
    teamResult2.pop();

    // Get Scores Outcome (Even/Odd)
    let teamStatus1 = parseScores(teamResult1);
    let teamStatus2 = parseScores(teamResult2);

    console.log(teamStatus1, teamStatus2);

    //////////////////////////// CHECK FOR RUN ////////////////////////////////////
    // Check run for team 1
    if(checkRun(teamStatus1)) {
        let data = {
            status : true,
            teamName: teamArray[0],
            runType: teamStatus2[0]
        }
        console.log(`
        Team: ${teamArray[0]}
        Run: ${teamStatus2[0]}
        URL: ${url}
    `);
    } else {
        let data = {
            status : false,
            teamName: teamArray[0],
        }
        console.log(data)
    }
    // Check run for team 2
    if(checkRun(teamStatus2)) {
        let data = {
            teamName: teamArray[1],
            runType: teamStatus2[0]
        }
        console.log(`
            Team: ${teamArray[1]}
            Run: ${teamStatus2[0]}
            URL: ${url}
        `);
    } else {
        let data = {
            status : false,
            teamName: teamArray[1],
        }
        console.log(data)
    }
  } catch (err) {
    console.error(err);
  }
}
// Invoke the above function
//scrapeData(url);

// Server 
app.listen(port, () => {
    console.log('The web server has started on port 3000');
    if(port === 3000) {
        console.log("http://localhost:3000");
    }
});