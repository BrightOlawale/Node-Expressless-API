// Description: Helper functions reside here

// Dependencies
const crypto = require('crypto');
const config = require('../configs');
const querystring = require('querystring');
const htttps = require('https');

// General container for all the helper functions
const helpers = {};

// Helper function for hashing passwords or strings, let use an arrow function this time. :)
helpers.hash = (strToHash) => {
    if (typeof(strToHash) != 'string' && strToHash.length <= 0){
        return false
    };
    
    // Go ahead and hash
    const theHash = crypto.createHmac('sha256', config.hashSecretVariable).update(strToHash).digest('hex');
    return theHash;
} 

// Helper function to parse JSON to object
helpers.jsonToObject = (strToConvert) => {
    try {
        const JSONobj = JSON.parse(strToConvert);
        return JSONobj;
    } catch (error) {
        return {};
    }
}

// Helper function to create a token of random strings
helpers.randomToken = function(len) {
    len = typeof(len) === 'number' && len > 0 ? len : false;

    if (len){
        const randOptions = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let finalString = '';

        for(let i = 0; i < len; i++){
            finalString += randOptions.charAt(Math.floor(Math.random() * randOptions.length));
        }
        return finalString;
    } else{
        return false;
    }
}

helpers.twilioSendSms = function(phone, message, callback){
    // Validate parameters
    phone = typeof(phone) === 'string' && phone.trim().length > 0 && phone.trim().length <= 15 ? phone.trim() : false;
    message = typeof(message) === 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false;

    if (phone && message){
        const payload = {
            'From': config.twilioObject.fromPhone,
            'To': phone,
            'Body': message
        }

        //Stringify the payload, Twillo doesn't use JSON
        const stringedPayload = querystring.stringify(payload);

        const requestData = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': '/2010-04-01/Accounts/'+config.twilioObject.accountSID+'/Messages.json',
            'auth': config.twilioObject.accountSID+':'+config.twilioObject.authToken,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringedPayload)
            }
        }

        const req = htttps.request(requestData, function(res){
            const statusCode = res.statusCode;

            if (statusCode === 200 || statusCode === 201){
                callback(false);
            } else{
                callback('Returned with status code '+ statusCode);
            }
        })

        req.on('error', function(e){
            callback(e);
        })

        req.write(stringedPayload);

        req.end();
    } else{
        callback('Neccessary parameters missing or invalid');
    }
};

// Export the container
module.exports = helpers;