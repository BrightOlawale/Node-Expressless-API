// Description: Worker file

// Dependencies
const path = require('path');
const fs = require('fs');
const Data = require('./dataLogic');
const helper = require('./helpers');
const url = require('url');
const htttp = require('http');
const https = require('https');
const logFile = require('./logs');

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

// Check validation function
workers.validateCheckData = function(checkData){
    checkData = typeof(checkData) === 'object' && checkData != null ? checkData : {};
    checkData.id = typeof(checkData.id) === 'string' && checkData.id.trim().length === 20 ? checkData.id.trim() : false;
    checkData.phone = typeof(checkData.phone) === 'string' && checkData.phone.trim().length > 0 && checkData.phone.trim().length <= 15 ? checkData.phone.trim() : false;
    checkData.protocol = typeof(checkData.protocol) === 'string' && ['http', 'https'].indexOf(checkData.protocol) != -1 ? checkData.protocol : false;
    checkData.url = typeof(checkData.url) === 'string' && checkData.url.trim().length > 0 ? checkData.url.trim() : false;
    checkData.method = typeof(checkData.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(checkData.method) != -1 ? checkData.method : false;
    checkData.successCode = typeof(checkData.successCode) === 'object' && checkData.successCode instanceof Array  && checkData.successCode.length > 0 ? checkData.successCode : false;
    checkData.timeoutSeconds = typeof(checkData.timeoutSeconds) === 'number' && checkData.timeoutSeconds % 1 === 0 && checkData.timeoutSeconds >= 1 && checkData.timeoutSeconds <= 5 ?  checkData.timeoutSeconds : false;
    
    // Set these keys if it wasn't 
    checkData.state = typeof(checkData.state) === 'string' && ['up', 'down'].indexOf(checkData.state) != -1 ? checkData.state : 'down';
    checkData.lastChecked = typeof(checkData.lastChecked) === 'number' && checkData.lastChecked > 0 ? checkData.lastChecked : false;

    if (checkData.id && checkData.url && checkData.phone&&
        checkData.protocol && checkData.method && checkData.successCode&&
        checkData.timeoutSeconds
        ){
            workers.doCheck(checkData)
        } else{
            console.log('Error: Some check value are not well formatted');
        }
}

// Function to actually perform the check
workers.doCheck = function(checkData){
    // Set outcome object
    const outcomeObject = {
        'error': false,
        'responseCode': false,
    }

    let outcomeSent = false;

    // Parse hostname and path out of the checkData 
    const parsedUrl = url.parse(checkData.protocol+'://'+checkData.url, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path;

    // construct request object
    const requestObject = {
        'protocol': checkData.protocol+':',
        'hostname': hostName,
        'method':  checkData.method.toUpperCase(),
        'path': path,
        'timeout': checkData.timeoutSeconds * 1000
    };

    // Retrieve the module to use
    const protocolModule = checkData.protocol === 'http' ? htttp : https;

    const req = protocolModule.request(requestObject, function(res){
        // Retrieve response status
        const resStatus = res.statusCode;

        // Update the outcome object with the appropriate responseCode
        outcomeObject.responseCode = resStatus;

        if (!outcomeSent){
            workers.processTheOutcome(checkData, outcomeObject)
            outcomeSent = true;
        }
    })

    // Bind to error outcome
    req.on('error', function(err){
        // Update outcomeObject
        outcomeObject.error = {
            'error': true,
            'value': err
        }

        if (!outcomeSent){
            workers.processTheOutcome(checkData, outcomeObject);
            outcomeSent = true;
        }
    })

    // Bind to the timeout event
    req.on('timeout', function(err){
        // Update outcomeObject
        outcomeObject.error = {
            'error': true,
            'value': 'timeout'
        }

        if (!outcomeSent){
            workers.processTheOutcome(checkData, outcomeObject)
            outcomeSent = true;
        }
    })

    // End request
    req.end()
};

// Function to process the check outcome and trigger an alert if the check went from up to down
workers.processTheOutcome = function(checkData, outcomeObject){
    const state = !outcomeObject.error && outcomeObject.responseCode && checkData.successCode.indexOf(outcomeObject.responseCode) != -1 ? 'up' : 'down';

    // Determine if trigering an alert is required
    const alertRequired = checkData.lastChecked && checkData.state != state ? true : false;

    //Log outcome
    const timeChecked = Date.now();
    workers.log(checkData, outcomeObject, state, alertRequired, timeChecked)

    // Update the checkDate
    const updatedCheckData = checkData;
    updatedCheckData.state = state;
    updatedCheckData.lastChecked = timeChecked;

    //  Save the update to record
    Data.update('checks', updatedCheckData.id, updatedCheckData, function(err){
        if (!err){
            if (alertRequired){
                workers.sendChangeStateAlert(updatedCheckData);
            } else{
                console.log('No changes to check yet, Check returned with response code: '+outcomeObject.responseCode)
            }
        } else{
            console.log('Error updating the check new data');
        }
    })
};

// Function to send a change in state alert
workers.sendChangeStateAlert = function(updatedCheckData){
    const message = "Alert: Your check for "+ updatedCheckData.method.toUpperCase() +" "+updatedCheckData.protocol+"://"+updatedCheckData.url+" has changed state to "+ updatedCheckData.state;
    helper.twilioSendSms(updatedCheckData.phone, message, function(err){
        if (!err){
            console.log('Success: Successfully sent a change in check state alert to user')
        } else{
            console.log('Error: Could not send a change in check state sms alert to user')
        }
    })
}

// Function to log important info to a file
workers.log = function(checkData, outcomeObject, state, alertRequired, timeChecked){
    const logObject = {
        'main_check': checkData,
        'check_outcome': outcomeObject,
        'current_state': state,
        'alert_required': alertRequired,
        'last_checked': timeChecked
    }

    // Convert the object to string
    const logString = JSON.stringify(logObject);

    // Determine file name
    const logFileName = checkData.id;

    // Append the data
    logFile.append(logFileName, logString, function(err){
        if (!err){
            console.log('SUCCESS: Logged to file successfully');
        } else{
            console.log('FAILED: could not log to file');
        }
    })
};

// Loop function defined
workers.loop = function(){
    setInterval(function(){
        workers.getAllChecks()
    }, 1000 * 60)
}

// Compression loop function
workers.logCompressionLoop = function(){
    setInterval(function(){
        workers.compressLogs();
    }, 1000 * 60 * 60 * 24);
}

// Function to compress logs
workers.compressLogs = function(){
    // List all non compressed files
    logFile.list(false, function(err, logs){
        if (!err && logs && logs.length > 0){
            logs.forEach((logFilename)=> {
                const logId = logFilename.replace('.log', '');
                const newFilename = logId+'-'+Date.now();
                
                logFile.compress(logId, newFilename, function(err){
                    if (!err){
                        logFile.truncate(logId, function(err){
                            if (!err){
                                console.log('Successfully truncated log file');
                            } else{
                                console.log('Error truncating log file');
                            }
                        })
                    } else{
                        console.log('Error compressing log file: ', err);
                    }
                })
            })
        } else{
            console.log("Could not find any log to compress");
        }
    })
}

// Initialization function
workers.init = function(){
    // Execute all available checks immediately
    workers.getAllChecks();

    // Loop to continue executing checks
    workers.loop();

    // Compress all logs immediately
    workers.compressLogs();

    // Compression loop to compress logs later
    workers.logCompressionLoop();
}

module.exports = workers;