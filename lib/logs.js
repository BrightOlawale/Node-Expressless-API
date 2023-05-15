// Description: A file for logging errors and success data

// Dependencies
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// Log functions container
const log = {};

// Base Directory
const baseDir = path.join(__dirname, '/../.logs/');

// Function to append a string to file and create if it doesn't  exist
log.append = function(file, strData, callback){
    // Open file for appending
    fs.open(baseDir+file+'.log', 'a', function(err, fd){
        if (!err && fd){
            // Append to the file and close it 
            fs.appendFile(fd, strData+'\n', function(err){
                if (!err){
                    // Close file
                    fs.close(fd, function(err){
                        if (!err){
                            callback(false);
                        } else{
                            callback('Error closing the file that was being appended to')
                        }
                    })
                } else{
                    callback('Error appending to file')
                }
            })
        } else{
            callback('Could not open file for appending');
        }
    })
}

// Function to list all the file in the log directory and optionally include the compressed logs
log.list = function(compressedLogIncluded, callback){
    // Read the directory
    fs.readdir(baseDir, function(err, data){
        if (!err && data && data.length > 0){
            const trimmedFile = [];
            data.forEach((fileName)=> {
                if (fileName.indexOf('.log') != -1){
                    trimmedFile.push(fileName.replace('.log', ''));
                }

                // Add the compressed file if the compressedLogIncluded === true;
                if (fileName.indexOf('.gz.b64') != -1 && compressedLogIncluded){
                    trimmedFile.push(fileName.replace('.gz.b64', ''));
                }
            })
            callback(false, trimmedFile);
        } else{
            callback(err, data)
        }
    })
}



module.exports = log