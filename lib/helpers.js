// Description: Helper functions reside here

// Dependencies
const crypto = require('crypto');
const config = require('../configs');

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

// Export the container
module.exports = helpers;