// Description: Worker file

// Dependencies
const path = require('path');
const fs = require('fs');
const Data = require('./dataLogic');
const helper = require('./helpers');
const url = require('url');
const htttp = require('http');
const https = require('https');

// General workers container
const workers = {};

// Function to get all checks and pass them each to a check Validator
workers.getAllChecks = function(){
    // Get the all the check in check folder
    Data.list('checks', function(err, checkList){
        if (!err && checkList && checkList.length > 0){
            //  For each of the check in the array, read and process each
            checkList.forEach((element) => {
                    Data.read('checks', element, function(err, mainCheckData){
                        if (!err && mainCheckData){
                            // pass the data to the validator
                            workers.validateCheckData(mainCheckData);
                        } else{
                            console.log('Error: Error reading one of the check data');
                        }
                    })
            });
        } else{
            console.log('Error: No check to process')
        }
    })
}


// Loop function defined
workers.loop = function(){
    setInterval(function(){
        workers.getAllChecks()
    }, 1000 * 120)
}

// Initialization function
workers.init = function(){
    // Execute all available checks immediately
    workers.getAllChecks();

    // Loop to continue executing checks
    workers.loop();
}

module.exports = workers;