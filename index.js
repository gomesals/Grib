(function() {
	'use strict';

	const MESSAGE_IDENTIFICATOR_LENGHT = 4,
		MESSAGE_SIZE_FIELD_LENGHT = 3,
		grib = module.exports = {},
		fs = require('fs'),
		tools = require('./fn/tools'),
		grib_tools = require('./fn/grib');

	var contentCenter = null,
		center = null,
		fileSize = 0,
		message = [],
		messages = [],
		currentPosition = 0,
		messagesIndex = 0;

	grib.load = (file, centerPath, callback) => {
		// fix the path
		if(file[0] === '/' || file[0] === '\\') {
			file = '.' + file;
		}

		// check if centerPath is a callback or a center desc. file
		if(typeof centerPath === 'function') {
			// if no centerPath is provided, them a callback is assumed
			callback = centerPath;

			// read the default desc
			contentCenter = fs.readFileSync(__dirname + "/CPTEC.json");
			center = JSON.parse(contentCenter);
		} else {
			// fix the path
			if(centerPath[0] === '/' || centerPath[0] === '\\') {
				centerPath = '.' + centerPath;
			}

			// read the desc provided by centerPath
			contentCenter = fs.readFileSync(centerPath);
			center = JSON.parse(contentCenter);

			if(typeof callback === 'undefined') {
				throw new Error('A callback is necessary.');
			}
		}


		fileSize = fs.statSync(file)
			.size;

		fs.readFile(file, 'binary', (err, data) => {
			if(err) throw err;

			// read all the file
			while(currentPosition < fileSize) {
				const msg = readMessage(data);

				// check if some error was returned
				if(typeof msg === 'string') {
					callback(msg, null);
				}
			}

			callback(null, messages);
		});
	};

	function readMessage(data) {
		if(grib_tools.isValid(data.substring(0, MESSAGE_IDENTIFICATOR_LENGHT))) {
			if(data.length < 8) {
				return 'Message is too short';
			}
			const messageSize = grib_tools._readMessageSizeFromFile(data);
			if(grib_tools.isVersionValid(tools.ord(data.substring(4, 5)))) {
				const dm = describeMessage(decode(data));
				if(typeof dm === 'string') {
					return dm;
				}
				currentPosition += 4;
			} else {
				return 'Unsupported Grib Version';
			}
		} else {
			return 'File invalid';
		}
	}

	function decode(data) {
		var r = grib_tools._getRawSectionFromMessage(data, currentPosition, 8);
		currentPosition += r.curPos;

		const dis = grib_tools.decodeIndicatorSection(r.raw);
		message.messageLength = dis.messageLength;
		message.messageVersion = dis.messageVersion;

		r = grib_tools._getRawSectionFromMessage(data, currentPosition, false);
		currentPosition += r.curPos;

		const dpds = grib_tools.decodeProductDefinitionSection(r.raw);
		message.parameterTableVersion = dpds.parameterTableVersion;
		message.originCenterId = dpds.originCenterId;
		message.originProcessId = dpds.originProcessId;
		message.gridId = dpds.gridId;
		message.hasGDS = dpds.hasGDS;
		message.hasBMS = dpds.hasBMS;
		message.parameterId = dpds.parameterId;
		message.levelTypeId = dpds.levelTypeId;
		message.levelValue = dpds.levelValue;
		message.referenceTime = dpds.referenceTime;
		message.timeUnit = dpds.timeUnit;
		message.timePeriod1 = dpds.timePeriod1;
		message.timePeriod2 = dpds.timePeriod2;
		message.timeRangeIndicator = dpds.timeRangeIndicator;
		message.avgNumberIncluded = dpds.avgNumberIncluded;
		message.avgNumberMissing = dpds.avgNumberMissing;
		message.originSubcenterId = dpds.originSubcenterId;
		message.decimalScaleFactor = dpds.decimalScaleFactor;

		if(message.hasGDS) {
			r = grib_tools._getRawSectionFromMessage(data, currentPosition, false);
			currentPosition += r.curPos;

			const dgds = grib_tools.decodeGridDescriptionSection(r.raw);
			if(typeof dgds === 'string') {
				return dgds;
			}
			message.gridRepresentationType = dgds.gridRepresentationType;
			message.gridDescription = [];
			message.gridDescription.latitudePoints = dgds.gridDescription.latitudePoints;
			message.gridDescription.longitudePoints = dgds.gridDescription.longitudePoints;
			message.gridDescription.latitudeFirstPoint = dgds.gridDescription.latitudeFirstPoint;
			message.gridDescription.longitudeFirstPoint = dgds.gridDescription.longitudeFirstPoint;
			message.gridDescription.incrementsGiven = dgds.gridDescription.incrementsGiven;
			message.gridDescription.useOblateSpheroidFigure = dgds.gridDescription.useOblateSpheroidFigure;
			message.gridDescription.windComponentsAsGrid = dgds.gridDescription.windComponentsAsGrid;
			message.gridDescription.latitudeLastPoint = dgds.gridDescription.latitudeLastPoint;
			message.gridDescription.longitudeLastPoint = dgds.gridDescription.longitudeLastPoint;
			message.gridDescription.longitudinalIncrement = dgds.gridDescription.longitudinalIncrement;
			message.gridDescription.latitudinalIncrement = dgds.gridDescription.latitudinalIncrement;
			message.gridDescription.scanToNorth = dgds.gridDescription.scanToNorth;
			message.gridDescription.scanToWest = dgds.gridDescription.scanToWest;
			message.gridDescription.scanLatitudeConsecutive = dgds.gridDescription.scanLatitudeConsecutive;
		} else {
			// TODO implements
		}
		if(message.hasBMS) {
			return 'BMS decoder not implemented!';
		}

		r = grib_tools._getRawSectionFromMessage(data, currentPosition, false);
		currentPosition += r.curPos;

		const dbds = grib_tools.decodeBinaryDataSection(r.raw);
		message.dataIsInteger = dbds.dataIsInteger;
		message.unusedBytes = dbds.unusedBytes;
		message.binaryScaleFactor = dbds.binaryScaleFactor;
		message.referenceValue = dbds.referenceValue;
		message.pointDataLength = dbds.pointDataLength;
		// message.rawData = dbds.rawData;
		return message;
	}

	function describeMessage(raw) {
		if(typeof raw === 'string') {
			return raw;
		}

		const levelType = raw.levelTypeId,
			levelValue = raw.levelValue,
			parameterId = raw.parameterId,
			parameterDescription = '(' + parameterId + ' ' + center[parameterId].abbr + ' ) ' + center[parameterId].def,
			msg = 'Message ' + messagesIndex + ' contains parameter: ' + parameterDescription + ' at level ' + levelValue + ' of type ' + levelType + '.';

		messages[messagesIndex] = {
			'data': raw,
			'message': msg
		};
		messagesIndex++;

		// tells that everything is ok
		return true;
	}
})();
