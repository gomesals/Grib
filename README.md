# Grib
[![License](https://poser.pugx.org/laravel/framework/license.svg)](http://opensource.org/licenses/MIT)

A GRIB (Gridded Binary) parser in JavaScript

For now there are no documentation available.
The project is not yet complete, but I am still working on it.

----

# Installing & Usage

## Installing

This is a module, therefore all files except the sample folder, must be within the folder `node_modules/grib`

## Usage

```javascript
grib = require('grib');
grib.load(file [, messages], callback(err, data){});
```

### Options
- `file`: The path to the file;
- `messages`: Optional. A file containing the messages which will be used by the app;
- `callback`: A function to handle the response.

#### Example
```javascript
grib = require('grib');
grib.load('./grib_files/example.grb', function(err, data){
    if(err) throw err;

    var response = '';

    for(var i = 0; i < data.length; ++i){
        response += data[i].message;
    }
    console.log(response);
});
```

**or**

```javascript
grib = require('grib');
grib.load('./grib_files/example.grb', 'some_center.json', function(err, data){
    if(err) throw err;

    var response = '';

    for(var i = 0; i < data.length; ++i){
        response += data[i].message;
    }
    console.log(response);
});
```
**or**

You can open `./sample/index.js` file and check how I wrote the code (line 29).

# Note
I'm not sure if it is well explained, but there is a sample folder that I truly hope it helps you. ;)

# License
This library is licensed under the MIT License (http://opensource.org/licenses/MIT).
