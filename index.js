(function() {
	'use strict';
	const grib = require(__dirname + '/grib');
	const express = require('express');
	const app = express();
	const multer = require('multer');
	const pug = require('pug');
	const fs = require('fs');
	const upload = multer({
		dest: './grib_files/'
	});
	app.set('view engine', 'pug');
	app.get('/', (req, res) => {
		res.render(__dirname + '/pages/index');
	});
	app.post('/upload', upload.single('grib_file'), (req, res) => {
		const grib_hash = Date.now();
		const fileName = "grib_" + grib_hash + ".grb";
		fs.renameSync(__dirname + "/grib_files/" + req.file.filename, __dirname + "/grib_files/" + fileName);
		res.redirect('/check?grib_hash=' + grib_hash);
	});
	app.get('/check', (req, res) => {
		const grib_hash = req.query.grib_hash;
		grib.load('./grib_files/grib_' + grib_hash + '.grb', (err, data) => {
			if (err) throw err;
			var response = [];
			for (var i = 0; i < data.length; ++i) {
				response.push(data[i].message);
			}
			res.render(__dirname + '/pages/result', {
				action: 'Checking file',
				hashKey: grib_hash,
				messages: response
			});
		});
	});
	const server = app.listen(8080, () => {
		console.log('Server running at http://localhost:8080/');
	});
})();