(function() {
	'use strict';
	const MESSAGE_IDENTIFICATOR_LENGHT = 4;
	const MESSAGE_SIZE_FIELD_LENGHT = 3;
	const grib = module.exports = {};
	const fs = require('fs');
	const tools = require('./fn/tools');
	const gribTools = require('./fn/grib');
	var contentCenter = null;
	var center = null;
	var fileSize = 0;
	var message = [];
	var messages = [];
	var currentPosition = 0;
	var messagesIndex = 0;
	grib.load = (file, centerPath, next) => {
		// fixes file path if necessary
		file = (file[0] !== '.') ? '.' + file : file;
		// checks if centerPath is a callback or a center desc. file
		if (typeof centerPath === 'function') {
			// if no centerPath is provided, then a callback is assumed
			next = centerPath;
			centerPath = __dirname + '/center/CPTEC.json';
		} else {
			// fixes center path if necessary
			centerPath = (centerPath[0] !== '.' ? '.' + centerPath : centerPath);
			if (typeof next === 'undefined') {
				throw new Error('A callback is necessary.');
			}
		}
		// reads the content provided by the center
		contentCenter = fs.readFileSync(centerPath);
		center = JSON.parse(contentCenter);
		fileSize = fs.statSync(file).size;
		fs.readFile(file, 'binary', (err, data) => {
			if (err) throw err;
			// reads all the file
			while (currentPosition < fileSize) {
				const msg = readMessage(data);
				// check if some error was returned
				if (typeof msg === 'string') {
					next(msg, null);
				}
			}
			next(null, messages);
		});
	};

	function readMessage(data) {
		if (gribTools.isValid(data.substring(0, MESSAGE_IDENTIFICATOR_LENGHT))) {
			if (data.length < 8) {
				return 'Message is too short';
			}
			const messageSize = gribTools.readMessageSizeFromFile(data);
			if (gribTools.isVersionValid(tools.ord(data.substring(4, 5)))) {
				const dm = describeMessage(decode(data));
				if (typeof dm === 'string') {
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
		var r = gribTools.getRawSectionFromMessage(data, currentPosition, 8);
		currentPosition += r.curPos;
		const dis = gribTools.decodeIndicatorSection(r.raw);
		message.messageLength = dis.messageLength;
		message.messageVersion = dis.messageVersion;
		r = gribTools.getRawSectionFromMessage(data, currentPosition, false);
		currentPosition += r.curPos;
		const dpds = gribTools.decodeProductDefinitionSection(r.raw);
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
		if (message.hasGDS) {
			r = gribTools.getRawSectionFromMessage(data, currentPosition, false);
			currentPosition += r.curPos;
			const dgds = gribTools.decodeGridDescriptionSection(r.raw);
			if (typeof dgds === 'string') {
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
		if (message.hasBMS) {
			return 'BMS decoder not implemented!';
		}
		r = gribTools.getRawSectionFromMessage(data, currentPosition, false);
		currentPosition += r.curPos;
		const dbds = gribTools.decodeBinaryDataSection(r.raw);
		message.dataIsInteger = dbds.dataIsInteger;
		message.unusedBytes = dbds.unusedBytes;
		message.binaryScaleFactor = dbds.binaryScaleFactor;
		message.referenceValue = dbds.referenceValue;
		message.pointDataLength = dbds.pointDataLength;
		// message.rawData = dbds.rawData;
		return message;
	}

	function describeMessage(raw) {
		if (typeof raw === 'string') {
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