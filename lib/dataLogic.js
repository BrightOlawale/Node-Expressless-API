//  Description: Library for storing and editing data

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// General container for the module to be exported
const dataLib = {};

// Get base directory  for the data folder
const baseDir = path.join(__dirname, '/../.data/');

// Function to write data to file
dataLib.create = function(dir, file, data, callback){
    // Open file for writing
    fs.open(baseDir+dir+'/'+file+'.json', 'wx', function(err, fileDescriptor){
        if (err && !fileDescriptor){
            callback('Unable to createnew file, check if it already exists');
        }

        // Convert the data to string
        const stringedData = JSON.stringify(data);

        // Write to the file and close it
        fs.writeFile(fileDescriptor, stringedData, function(err){
            if (err){
                callback('Error writing to file');
            }
            fs.close(fileDescriptor, function(err){
                if (err){
                    callback('Error closing file');
                }
                callback(false);
            })
        })
    });
};

// Function to read data from file
dataLib.read = function(dir, file, callback){
    fs.readFile(baseDir+dir+'/'+file+'.json', 'utf-8', function(err, data){
        if (!err && data){
            let objectifiedData = helpers.jsonToObject(data);
            callback(false, objectifiedData);
        } else{
            callback(err, data);
        }
    })
};

// Function to update data in a file
dataLib.update = function(dir, file, data, callback){
    // Create the file path
    const filePath = baseDir+dir+'/'+file+'.json';

    // Open the file for writing 
    fs.open(filePath, 'r+', function(err, fileDescriptor){
        if (err && !fileDescriptor){
            callback("Unable to open the file, check if file exists");
        }

        //  Convert the data to string
        const stringedData = JSON.stringify(data);

        // Truncate the file
        fs.truncate(filePath, function(err){
            if (err){
                callback('Error truncating file');
            }

            //  Write to the file
            fs.writeFile(fileDescriptor, stringedData, function(err){
                if (err){
                    callback("Error Updating file");
                }

                fs.close(fileDescriptor, function(err){
                    if (err){
                        callback("Error closing the file");
                    } else{
                        callback(false);
                    }
                })
            })
        })
    })
};

// Delete a file
dataLib.delete = function(dir, file, callback){
    // Get the file path
    const filePath = baseDir+dir+'/'+file+'.json';

    // Unlink the file
    fs.unlink(filePath, function(err){
        if (err){
            callback("Error deleting the file")
        };
        callback(false);
    })
};

// Export the container
module.exports = dataLib;