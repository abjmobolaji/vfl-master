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


// Async function which scrapes the data for teams on a run
async function scrapeWinningData(url, index = 1) {
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
                url: url
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
                url: url
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

async function showGames() {
	let myGames = [];
	let matchNo;
	for(let i = 0;  i < 8; i++) {
		let data = await scrapeWinningData(urls[i], i);
		if(i == 0) matchNo = data.matchNo;
		if(data) myGames.push(data);
	}
}

showGames();