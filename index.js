const grib = require(__dirname + '/grib'),
	express = require('express'),
	app = express(),
	multer = require('multer'),
	jade = require('jade'),
	fs = require('fs'),
	upload = multer({
		dest: './grib_files/'
	});

app.set('view engine', 'jade');

app.get('/', (req, res) => {
	res.render(__dirname + '/pages/index');
});

app.post('/upload', upload.single('grib_file'), (req, res) => {
	const grib_hash = Date.now(),
		fileName = "grib_" + grib_hash + ".grb";

	fs.renameSync(__dirname + "/grib_files/" + req.file.filename, __dirname + "/grib_files/" + fileName);

	res.redirect('/check?grib_hash=' + grib_hash);
});

app.get('/check', (req, res) => {
	const grib_hash = req.query.grib_hash;

	grib.load('./grib_files/grib_' + grib_hash + '.grb', (err, data) => {
		if(err) throw err;

		var response = [];

		for(var i = 0; i < data.length; ++i) {
			response.push(data[i].message);
		}
		res.render(__dirname + '/pages/result', {
			action: 'Checking file',
			hashKey: grib_hash,
			messages: response
		});
	});
});

var server = app.listen(8080, () => {
	const host = server.address()
		.address,
		port = server.address()
		.port;
	console.log('Server running at http://localhost/' + port);
});
