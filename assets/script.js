// Get sum of an array
function add(accumulator, a) {
    return accumulator + a;
}

// Calculate Stake
function calculateStake() {
    // Initialize stake
    var stake = 500;
    let capital = Number($("#stakeCapital").val());
    // Validate Stake Amount
    if(capital < 16900) {
        alert("Capital is too low for VFL!!!");
        return;
    } else if(capital >= 16900 && capital <= 35,000) {
        var stake = 500;
    } else if(capital > 35000 && capital <= 70000) {
        var stake = 1000;
    } else if(capital > 70000 && capital <= 99999) {
        var stake = 1500;
    } else if(capital > 99999) {
        var stake = 2000;
    }

    // Initalize Odds
    const odds = 0.7; // Odds = 1.7 (1.7 - 1) = 0.7

    // Intialize the 3 Arrays
    let amountToWinArr = [];
    let stakeArr = [];
    let cummulativeArr = [];

    for(let i = 0; i < 5; i++) {
        // Push Stake in the Amount to Win Arr
        amountToWinArr.push(stake);
        let bet = Math.ceil(stake/odds);
        // Push Bet in the Stake Array
        stakeArr.push(bet);
        // Add Cummulative
        if(i === 0) {
            cummulativeArr.push(bet)
        } else {
            let previousCummulative = stakeArr.reduce(add, 0);
            cummulativeArr.push(previousCummulative);
        }
        // Update Stake
        stake += bet; 
    }
    displayStake(amountToWinArr, stakeArr, cummulativeArr);
}

// Display Stake Table
function displayStake(amountToWinArr, stakeArr, cummulativeArr) {
    let html = `<table class="table table-striped">
        <thead class="bg-nav">
          <tr>
            <th scope="col">#</th>
            <th scope="col">Amount to Win</th>
            <th scope="col">Stake</th>
            <th scope="col">Cummulative</th>
          </tr>
        </thead>
        <tbody>`;
    for(let i = 0;  i < 5; i++) {
        let badge = (i < 4) ? "success" : "danger";
        html += `
            <tr>
                <th scope="row">${i+1}</th>
                <td>₦${numberWithCommas(amountToWinArr[i])}</td>
                <td class="alert-${badge} make-bold border-bottom">₦${numberWithCommas(stakeArr[i])}</td>
                <td>₦${numberWithCommas(cummulativeArr[i])}</td>
            </tr>`;
    }
    html += `</tbody>
        </table>`;
    // Update Body 
    $("#stakeTable").html(html);
}

// Number with Commas
function numberWithCommas(x) {
    // return x.toLocaleString();
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Get Url
function getURL() {
    let localLink = 'http://localhost:3000/';
    let liveLink = 'https://vfl-masters.herokuapp.com/';
    let url = window.location.href;
    return (url.split(":")[0] == "http") ? localLink : liveLink;
    // return localLink;
}

// Display Empty table
function displayEmpty(id) {
    $(`#${id}`).addClass("d-none");
    $(`#emptyTable`).removeClass("d-none");
}