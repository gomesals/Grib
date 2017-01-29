(function() {
	'use strict';
	const moment = require('moment');
	const tools = require('../fn/tools');
	module.exports = {
		isValid: (c) => (c === 'GRIB') ? true : false,
		isVersionValid: (v) => (v === 1) ? true : false,
		getNextSectionLength: function(message, pos) {
			return this.getUInt(message, pos, 3);
		},
		getNextSectionLength2: function(message, pos) {
			return this.getUInt(message, pos, 3);
		},
		getUInt: (data, start, length) => {
			if (typeof data == 'number') {
				return 0;
			}
			const to = start + length;
			const what = data.substring(start, to);
			const value = tools.unpack('H*r', what);
			return tools.h2d(value.r);
		},
		getRawSectionFromMessage: function(message, pos, length) {
			if (length === false) {
				length = this.getNextSectionLength(message, pos);
			}
			const to = pos + length;
			const raw = message.substring(pos, to);
			return {
				curPos: length,
				raw: raw,
			};
		},
		decodeIndicatorSection: function(raw) {
			return {
				messageLength: this.getUInt(raw, 4, 3),
				messageVersion: this.getUInt(raw, 7, 1),
			};
		},
		decodeProductDefinitionSection: function(raw) {
			const century = this.getUInt(raw, 24, 1);
			const year = this.getUInt(raw, 12, 1);
			const yearFinal = (century - 1) * 100 + year;
			var date = moment().set({
				'year': yearFinal,
				'month': this.getUInt(raw, 13, 1) - 1,
				'date': this.getUInt(raw, 14, 1),
				'hour': this.getUInt(raw, 15, 1),
				'minute': this.getUInt(raw, 16, 1),
				'second': 0,
				'millisecond': 0
			});
			return {
				parameterTableVersion: this.getUInt(raw, 3, 1),
				originCenterId: this.getUInt(raw, 4, 1),
				originProcessId: this.getUInt(raw, 5, 1),
				gridId: this.getUInt(raw, 6, 1),
				hasGDS: this.isFlagSet(128, raw, 7),
				hasBMS: this.isFlagSet(64, raw, 7),
				parameterId: this.getUInt(raw, 8, 1),
				levelTypeId: this.getUInt(raw, 9, 1),
				levelValue: this.getUInt(raw, 10, 2),
				referenceTime: date.format('x'),
				timePeriod1: this.getUInt(raw, 18, 1),
				timeUnit: this.getUInt(raw, 17, 1),
				timePeriod2: this.getUInt(raw, 19, 1),
				timeRangeIndicator: this.getUInt(raw, 20, 1),
				avgNumberIncluded: this.getUInt(raw, 21, 2),
				avgNumberMissing: this.getUInt(raw, 23, 1),
				originSubcenterId: this.getUInt(raw, 25, 1),
				decimalScaleFactor: this.getSignedInt(raw, 26, 2),
			};
		},
		isFlagSet: (flag, string, pos) => {
			const byte = tools.ord(string.substring(pos, pos + 1));
			return ((byte & flag) == flag);
		},
		getSignedInt: function(string, start, length) {
			const uInt = this.getUInt(string, start, length);
			const signal = uInt & (1 << (8 * length) - 1);
			const value = uInt & ~((1 << (8 * length) - 1));
			return (signal ? -value : value);
		},
		decodeBinaryDataSection: function(raw) {
			const isHarmonicCoefficients = this.isFlagSet(128, raw, 3);
			const isComplexPacking = this.isFlagSet(64, raw, 3);
			if (isHarmonicCoefficients || isComplexPacking) {
				// console.log('UNSUPPORTEDPACKING'); ##
			}
			return {
				dataIsInteger: this.isFlagSet(32, raw, 3),
				unusedBytes: (this.getUInt(3, 3, 1)) & 15,
				binaryScaleFactor: this.getSignedInt(raw, 4, 2),
				referenceValue: this.getSingle(raw, 6),
				pointDataLength: this.getUInt(raw, 10, 1),
				rawData: raw.substring(11),
			};
		},
		getSingle: function(string, pos) {
			const A = this.getSignedInt(string, pos, 1);
			const B = this.getUInt(string, pos + 1, 3);
			return Math.pow(2, -24) * B * Math.pow(16, A - 64);
		},
		decodeGridDescriptionSection: function(raw) {
			const gridRepresentationType = this.getUInt(raw, 5, 1);
			// Plate Carree (0) grid
			if (gridRepresentationType === 0) {
				return {
					gridRepresentationType: gridRepresentationType,
					gridDescription: this.decodeLatLonGridDescription(raw.substring(6)),
				};
			} else {
				return 'Unsupported Grid';
			}
		},
		decodeLatLonGridDescription: function(raw) {
			return {
				longitudePoints: this.getUInt(raw, 0, 2),
				latitudePoints: this.getUInt(raw, 2, 2),
				latitudeFirstPoint: this.getSignedInt(raw, 4, 3),
				longitudeFirstPoint: this.getSignedInt(raw, 7, 3),
				latitudeLastPoint: this.getSignedInt(raw, 11, 3),
				longitudeLastPoint: this.getSignedInt(raw, 14, 3),
				incrementsGiven: this.isFlagSet(128, raw, 10),
				useOblateSpheroidFigure: this.isFlagSet(64, raw, 10),
				windComponentsAsGrid: this.isFlagSet(8, raw, 10),
				longitudinalIncrement: (this.getUInt(raw, 17, 2) === 65535) ? false : this.getUInt(raw, 17, 2),
				latitudinalIncrement: (this.getUInt(raw, 19, 2) === 65535) ? false : this.getUInt(raw, 19, 2),
				scanToWest: this.isFlagSet(128, raw, 21),
				scanToNorth: this.isFlagSet(64, raw, 21),
				scanLatitudeConsecutive: this.isFlagSet(32, raw, 21)
			};
		},
		readMessageSizeFromFile: (raw) => tools.h2d(tools.unpack('H6size', raw).size.substring(0, 6)),
	};
})();