module.exports = {
	isValid: (c) => {
		return(c === 'GRIB') ? true : false;
	},
	isVersionValid: (v) => {
		return(v === 1) ? true : false;
	},
	_getNextSectionLength: function(message, pos) {
		return this._getUInt(message, pos, 3);
	},
	_getUInt: (string, start, length) => {
		const tools = require('../fn/tools');
		if(typeof string == 'number') {
			return 0;
		}
		const to = start + length,
			what = string.substring(start, to),
			value = tools.unpack('H*r', what);

		return tools.h2d(value.r);
	},
	_getRawSectionFromMessage: function(message, pos, length) {
		if(length === false) {
			length = this._getNextSectionLength(message, pos);
		}
		const to = pos + length,
			raw = message.substring(pos, to);
		return {
			'curPos': length,
			'raw': raw,
		};
	},
	decodeIndicatorSection: function(raw) {
		return {
			'messageLength': this._getUInt(raw, 4, 3),
			'messageVersion': this._getUInt(raw, 7, 1),
		};
	},
	decodeProductDefinitionSection: function(raw) {
		let r = {
			'parameterTableVersion': this._getUInt(raw, 3, 1),
			'originCenterId': this._getUInt(raw, 4, 1),
			'originProcessId': this._getUInt(raw, 5, 1),
			'gridId': this._getUInt(raw, 6, 1),
			'hasGDS': this._isFlagSet(128, raw, 7),
			'hasBMS': this._isFlagSet(64, raw, 7),
			'parameterId': this._getUInt(raw, 8, 1),
			'levelTypeId': this._getUInt(raw, 9, 1),
			'levelValue': this._getUInt(raw, 10, 2),
			'referenceTime': null,
			'timePeriod1': null,
			'timeUnit': null,
			'timePeriod2': null,
			'timeRangeIndicator': null,
			'avgNumberIncluded': null,
			'avgNumberMissing': null,
			'originSubcenterId': null,
			'decimalScaleFactor': null,
		};

		const century = this._getUInt(raw, 24, 1),
			year = this._getUInt(raw, 12, 1),
			month = this._getUInt(raw, 13, 1),
			day = this._getUInt(raw, 14, 1),
			hour = this._getUInt(raw, 15, 1),
			minute = this._getUInt(raw, 16, 1),
			yearF = (century - 1) * 100 + year;

		r.referenceTime = Date.parse(new Date(yearF, month - 1, day, hour, minute, 0, 0));
		r.timePeriod1 = this._getUInt(raw, 18, 1);
		r.timeUnit = this._getUInt(raw, 17, 1);
		r.timePeriod2 = this._getUInt(raw, 19, 1);
		r.timeRangeIndicator = this._getUInt(raw, 20, 1);
		r.avgNumberIncluded = this._getUInt(raw, 21, 2);
		r.avgNumberMissing = this._getUInt(raw, 23, 1);
		r.originSubcenterId = this._getUInt(raw, 25, 1);
		r.decimalScaleFactor = this._getSignedInt(raw, 26, 2);

		return r;
	},
	_isFlagSet: (flag, string, pos) => {
		const tools = require('../fn/tools'),
			byte = tools.ord(string.substring(pos, pos + 1));
		return((byte & flag) == flag);
	},
	_getSignedInt: function(string, start, length) {
		const uInt = this._getUInt(string, start, length),
			signal = uInt & (1 << (8 * length) - 1),
			value = uInt & ~((1 << (8 * length) - 1));
		return(signal ? -value : value);
	},
	decodeBinaryDataSection: function(raw) {
		const isHarmonicCoefficients = this._isFlagSet(128, raw, 3),
			isComplexPacking = this._isFlagSet(64, raw, 3);
		if(isHarmonicCoefficients || isComplexPacking) {
			// console.log('UNSUPPORTED_PACKING'); ##
		}
		return {
			'dataIsInteger': this._isFlagSet(32, raw, 3),
			'unusedBytes': (this._getUInt(3, 3, 1)) & 15,
			'binaryScaleFactor': this._getSignedInt(raw, 4, 2),
			'referenceValue': this._getSingle(raw, 6),
			'pointDataLength': this._getUInt(raw, 10, 1),
			'rawData': raw.substring(11),
		};
	},
	_getSingle: function(string, pos) {
		const A = this._getSignedInt(string, pos, 1),
			B = this._getUInt(string, pos + 1, 3);
		return Math.pow(2, -24) * B * Math.pow(16, A - 64);
	},
	decodeGridDescriptionSection: function(raw) {
		const gridRepresentationType = this._getUInt(raw, 5, 1);
		// Plate Carree (0) grid

		if(gridRepresentationType === 0) {
			return {
				'gridRepresentationType': gridRepresentationType,
				'gridDescription': this.decodeLatLonGridDescription(raw.substring(6)),
			};
		} else {
			return 'Unsupported Grid';
		}
	},
	decodeLatLonGridDescription: function(raw) {
		const r = {
			'longitudePoints': this._getUInt(raw, 0, 2),
			'latitudePoints': this._getUInt(raw, 2, 2),
			'latitudeFirstPoint': this._getSignedInt(raw, 4, 3),
			'longitudeFirstPoint': this._getSignedInt(raw, 7, 3),
			'latitudeLastPoint': this._getSignedInt(raw, 11, 3),
			'longitudeLastPoint': this._getSignedInt(raw, 14, 3),
			'incrementsGiven': this._isFlagSet(128, raw, 10),
			'useOblateSpheroidFigure': this._isFlagSet(64, raw, 10),
			'windComponentsAsGrid': this._isFlagSet(8, raw, 10),
			'longitudinalIncrement': null,
			'latitudinalIncrement': null,
			'scanToWest': this._isFlagSet(128, raw, 21),
			'scanToNorth': this._isFlagSet(64, raw, 21),
			'scanLatitudeConsecutive': this._isFlagSet(32, raw, 21),
		};
		let longitudinalIncrement = this._getUInt(raw, 17, 2),
			latitudinalIncrement = this._getUInt(raw, 19, 2);

		if(longitudinalIncrement == 65535) {
			longitudinalIncrement = false;
		}
		if(latitudinalIncrement == 65535) {
			latitudinalIncrement = false;
		}
		r.longitudinalIncrement = longitudinalIncrement;
		r.latitudinalIncrement = latitudinalIncrement;
		return r;
	},
	_readMessageSizeFromFile: (raw) => {
		const tools = require('../fn/tools'),
			tmp = tools.unpack('H6size', raw);
		return tools.h2d(tmp.size.substring(0, 6));
	},
};
