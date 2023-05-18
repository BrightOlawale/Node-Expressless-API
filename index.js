/*
 * Description: Main file for the API
 * 
 */


// Dependencies
const server = require('./lib/server');
const workers = require('./lib/worker');

// App container
const app = {};

// Initialization function
app.init = function(){
    // Start server
    server.init();

    // Start woker
    workers.init()
}

app.init();


module.exports = app;
