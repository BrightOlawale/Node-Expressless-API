// Description: Request handlers defined here

// Define handlers
const handlers = {};

// Sample handler
// handlers.sample = function(data, callback){
//     callback(206, {'name': 'Sample handler'});
// };

// Ping handler: To check if server is Up
handlers.ping = function(data, callback){
    callback(206, {'status': 'Server is up'})
}

// Not found handler
handlers.notFound = function(data, callback){
    callback(404);
};

// Export module
module.exports = handlers;