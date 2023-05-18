/*
*Description: A file for logging errors and success data
*
*/


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


// Function to compress the listed file into .gz.b64 within the same directory
log.compress = function(logId, newFilename, callback){
    const soucreFile = logId+'.log';
    const destinationFile = newFilename+'.gz.b64';

    fs.readFile(baseDir+soucreFile, 'utf-8', function(err, data){
        if (!err && data){
            // Compress using zlib
            zlib.gzip(data, function(err, buffer){
                if (!err && buffer){
                    fs.open(baseDir+destinationFile, 'wx', function(err, fd){
                        if (!err && fd){
                            fs.writeFile(fd, buffer.toString('base64'), function(err){
                                if (!err){
                                    // Close the destination file
                                    fs.close(fd, function(err){
                                        if (!err){
                                            callback(false);
                                        } else{
                                            callback(err)
                                        }
                                    })
                                } else{
                                    callback(err)
                                }
                            })
                        } else{
                            callback(err);
                        }
                    })
                } else{
                    callback(err);
                }
            })
        } else{
            callback(err)
        }
    })
}

// Function to decompress content of a .gz.b64 file
log.decompress = function(fileId, callback){
    const fileName = fileId+'.gz.b64';

    fs.readFile(baseDir+fileName, 'utf-8', function(err, dataString){
        if (!err && dataString){
            // Decompress the data
            const inputBuffer = Buffer.from(dataString, 'base64');
            zlib.unzip(inputBuffer, function(err, outputBuffer){
                if (!err && outputBuffer){
                    const outputString = outputBuffer.toString();
                    callback(false, outputString);
                } else{
                    callback(err);
                }
            })
        } else{
            callback(err);
        }
    })
}

// Function to truncate a log file
log.truncate = function(logId, callback){
    fs.truncate(baseDir+logId+'.log', function(err){
        if (!err){
            callback(false);
        } else{
            callback(err)
        }
    })
}


module.exports = log