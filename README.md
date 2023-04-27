# API Server

* This is a simple API server built using Node.js without any framework. The server supports both HTTP and HTTPS requests.

## Dependencies
* The following dependencies are required to run the server:
    * http
    * htpps
    * url
    * string_decoder
    * fs

## Usage
* To start the server, simply run the `index.js` file using the command `node index.js`. This will start the HTTP server on the port specified in the `config.js` file (default is 3000) and the HTTPS server on the port specified in the `config.js `file (default is 3001). 

## Handlers
* The API currently supports one handler:
    - Sample handler (/sample)
* Additional handlers can be added to the `router` object in the `index.js` file.

## HTTPS
* To use HTTPS, SSL certificates must be generated and placed in the `https` folder. The filenames for the key and certificate should be `key.pem` and `cert.pem`, respectively.

## Requests
* The server currently supports the following requests:
    - GET
    - POST
    - PUT
    - DELETE