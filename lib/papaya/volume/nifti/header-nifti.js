
/*jslint browser: true, node: true */
/*global numeric */

"use strict";

var papaya = papaya || {};
papaya.volume = papaya.volume || {};
papaya.volume.nifti = papaya.volume.nifti || {};



papaya.volume.nifti.HeaderNIFTI = papaya.volume.nifti.HeaderNIFTI || function () {
    this.nifti = null;
    this.compressed = false;
};



papaya.volume.nifti.HeaderNIFTI.ORIENTATION_DEFAULT = "XYZ-++";
papaya.volume.nifti.HeaderNIFTI.SPATIAL_UNITS_MASK = 0x07;
papaya.volume.nifti.HeaderNIFTI.TEMPORAL_UNITS_MASK = 0x38;


papaya.volume.nifti.HeaderNIFTI.prototype.readData = function (data, compressed) {
    this.nifti = new papaya.volume.nifti.NIFTI();
    this.compressed = compressed;
    this.nifti.readData(data);
};



papaya.volume.nifti.HeaderNIFTI.prototype.getImageDimensions = function () {
    var id = new papaya.volume.ImageDimensions(this.nifti.dims[1], this.nifti.dims[2], this.nifti.dims[3], this.nifti.dims[4]);
    id.offset = this.nifti.vox_offset;
    return id;
};



papaya.volume.nifti.HeaderNIFTI.prototype.getVoxelDimensions = function (littleEndian) {
    /*jslint bitwise: true */
    var datatypeCode, vd;

    vd = new papaya.volume.VoxelDimensions(this.nifti.pixDims[1], this.nifti.pixDims[2], this.nifti.pixDims[3], this.nifti.pixDims[4]);

    datatypeCode = this.nifti.datatypeCode;

    if (!littleEndian) {
        datatypeCode = ((((datatypeCode & 0xFF) << 8) | ((datatypeCode >> 8) & 0xFF)) << 16) >> 16;
    }

    vd.spatialUnit = (datatypeCode & papaya.volume.nifti.HeaderNIFTI.SPATIAL_UNITS_MASK);
    vd.temporalUnit = (datatypeCode & papaya.volume.nifti.HeaderNIFTI.TEMPORAL_UNITS_MASK);

    return vd;
};



papaya.volume.nifti.HeaderNIFTI.prototype.getImageType = function () {
    var datatype = papaya.volume.ImageType.DATATYPE_UNKNOWN;

    if ((this.nifti.datatypeCode === papaya.volume.nifti.NIFTI_TYPE_UINT8) || (this.nifti.datatypeCode === papaya.volume.nifti.NIFTI_TYPE_UINT16)
            || (this.nifti.datatypeCode === papaya.volume.nifti.NIFTI_TYPE_UINT32) || (this.nifti.datatypeCode === papaya.volume.nifti.NIFTI_TYPE_UINT64)) {
        datatype = papaya.volume.ImageType.DATATYPE_INTEGER_UNSIGNED;
    } else if ((this.nifti.datatypeCode === papaya.volume.nifti.NIFTI_TYPE_INT8) || (this.nifti.datatypeCode === papaya.volume.nifti.NIFTI_TYPE_INT16)
            || (this.nifti.datatypeCode === papaya.volume.nifti.NIFTI_TYPE_INT32) || (this.nifti.datatypeCode === papaya.volume.nifti.NIFTI_TYPE_INT64)) {
        datatype = papaya.volume.ImageType.DATATYPE_INTEGER_SIGNED;
    } else if ((this.nifti.datatypeCode === papaya.volume.nifti.NIFTI_TYPE_FLOAT32) || (this.nifti.datatypeCode === papaya.volume.nifti.NIFTI_TYPE_FLOAT64)) {
        datatype = papaya.volume.ImageType.DATATYPE_FLOAT;
    }

    return new papaya.volume.ImageType(datatype, this.nifti.numBitsPerVoxel / 8, this.nifti.littleEndian, this.compressed);
};



papaya.volume.nifti.HeaderNIFTI.prototype.getOrientation = function () {
    var orientation = null;

    if ((this.nifti.qform_code > 0) && !this.qFormHasRotations()) {
        orientation = this.getOrientationQform();
    }

    if ((this.nifti.sform_code > this.nifti.qform_code) && !this.sFormHasRotations()) {
        orientation = this.getOrientationSform();
    }

    if (orientation === null) {
        orientation = papaya.volume.nifti.HeaderNIFTI.ORIENTATION_DEFAULT;
    }

    return new papaya.volume.Orientation(orientation);
};




papaya.volume.nifti.HeaderNIFTI.prototype.getOrientationQform = function () {
    var orientation = papaya.volume.nifti.HeaderNIFTI.ORIENTATION_DEFAULT,
        qFormMatParams = this.nifti.convertNiftiQFormToNiftiSForm(this.nifti.quatern_b, this.nifti.quatern_c, this.nifti.quatern_d, this.nifti.qoffset_x, this.nifti.qoffset_y, this.nifti.qoffset_z, this.nifti.pixDims[1], this.nifti.pixDims[2], this.nifti.pixDims[3], this.nifti.pixDims[0]);

    if (this.nifti.qform_code > 0) {
        orientation = this.nifti.convertNiftiSFormToNEMA(qFormMatParams);

        if (!papaya.volume.Orientation.prototype.isValidOrientationString(orientation)) {
            orientation = papaya.volume.nifti.HeaderNIFTI.ORIENTATION_DEFAULT;
        }
    } else {
        orientation = papaya.volume.nifti.HeaderNIFTI.ORIENTATION_DEFAULT;
    }

    return orientation;
};



papaya.volume.nifti.HeaderNIFTI.prototype.getOrientationSform = function () {
    var orientation = this.nifti.convertNiftiSFormToNEMA(this.nifti.affine);

    if (!papaya.volume.Orientation.prototype.isValidOrientationString(orientation)) {
        orientation = papaya.volume.nifti.HeaderNIFTI.ORIENTATION_DEFAULT;
    }

    return orientation;
};


//papaya.volume.nifti.HeaderNIFTI.prototype.getOriginQform = function () {
//    return this.getOrigin(true, false);
//};


//papaya.volume.nifti.HeaderNIFTI.prototype.getOriginSform = function () {
//    return this.getOrigin(false, true);
//};


papaya.volume.nifti.HeaderNIFTI.prototype.getQformMatCopy = function () {
    return this.nifti.getQformMat().clone();
};


papaya.volume.nifti.HeaderNIFTI.prototype.getSformMatCopy = function () {
    return this.nifti.affine.clone();
};



papaya.volume.nifti.HeaderNIFTI.prototype.getOrigin = function (forceQ, forceS) {
    var origin = new papaya.core.Coordinate(0, 0, 0),
        qFormMatParams,
        affineQform,
        affineQformInverse,
        affineSformInverse,
        orientation,
        xOffset,
        yOffset,
        zOffset,
        someOffsets;

    if ((this.nifti.qform_code > 0) && !forceS) {
        if (this.qFormHasRotations()) {
            affineQform = this.nifti.getQformMat();
            affineQformInverse = numeric.inv(affineQform);
            origin.setCoordinate(affineQformInverse[0][3], affineQformInverse[1][3], affineQformInverse[2][3]);
        } else {
            qFormMatParams = this.nifti.convertNiftiQFormToNiftiSForm(this.nifti.quatern_b, this.nifti.quatern_c, this.nifti.quatern_d,
                this.nifti.qoffset_x, this.nifti.qoffset_y, this.nifti.qoffset_z, this.nifti.pixDims[1], this.nifti.pixDims[2], this.nifti.pixDims[3],
                this.nifti.pixDims[0]);

            orientation = this.nifti.convertNiftiSFormToNEMA(qFormMatParams);

            if (!papaya.volume.Orientation.prototype.isValidOrientationString(orientation)) {
                orientation = papaya.volume.nifti.HeaderNIFTI.ORIENTATION_DEFAULT;
            }

            xOffset = this.nifti.qoffset_x * ((orientation.charAt(orientation.indexOf("X") + 3) === '+') ? -1 : 1);
            yOffset = this.nifti.qoffset_y * ((orientation.charAt(orientation.indexOf("Y") + 3) === '+') ? 1 : -1);
            zOffset = this.nifti.qoffset_z * ((orientation.charAt(orientation.indexOf("Z") + 3) === '+') ? 1 : -1);

            someOffsets = new Array(3);
            someOffsets[0] = xOffset < 0 ? (this.nifti.dims[1] + (xOffset / this.nifti.pixDims[1])) : (xOffset / Math.abs(this.nifti.pixDims[1]));
            someOffsets[1] = yOffset > 0 ? (this.nifti.dims[2] - (yOffset / this.nifti.pixDims[2])) : (yOffset / Math.abs(this.nifti.pixDims[2])) * -1;
            someOffsets[2] = zOffset > 0 ? (this.nifti.dims[3] - (zOffset / this.nifti.pixDims[3])) : (zOffset / Math.abs(this.nifti.pixDims[3])) * -1;

            origin.setCoordinate(someOffsets[0], someOffsets[1], someOffsets[2], true);
        }
    } else if ((this.nifti.sform_code > 0) && !forceQ) {
        if (this.sFormHasRotations()) {
            affineSformInverse = numeric.inv(this.nifti.affine);
            origin.setCoordinate(affineSformInverse[0][3], affineSformInverse[1][3], affineSformInverse[2][3]);
        } else {
            orientation = this.nifti.convertNiftiSFormToNEMA(this.nifti.affine);

            if (!papaya.volume.Orientation.prototype.isValidOrientationString(orientation)) {
                orientation = papaya.volume.nifti.HeaderNIFTI.ORIENTATION_DEFAULT;
            }

            xOffset = this.nifti.affine[0][3] * ((orientation.charAt(orientation.indexOf("X") + 3) === '+') ? -1 : 1);
            yOffset = this.nifti.affine[1][3] * ((orientation.charAt(orientation.indexOf("Y") + 3) === '+') ? 1 : -1);
            zOffset = this.nifti.affine[2][3] * ((orientation.charAt(orientation.indexOf("Z") + 3) === '+') ? 1 : -1);

            someOffsets = new Array(3);
            someOffsets[0] = xOffset < 0 ? (this.nifti.dims[1] + (xOffset / this.nifti.pixDims[1])) : (xOffset / Math.abs(this.nifti.pixDims[1]));
            someOffsets[1] = yOffset > 0 ? (this.nifti.dims[2] - (yOffset / this.nifti.pixDims[2])) : (yOffset / Math.abs(this.nifti.pixDims[2])) * -1;
            someOffsets[2] = zOffset > 0 ? (this.nifti.dims[3] - (zOffset / this.nifti.pixDims[3])) : (zOffset / Math.abs(this.nifti.pixDims[3])) * -1;

            origin.setCoordinate(someOffsets[0], someOffsets[1], someOffsets[2], true);
        }
    }

    if (origin.isAllZeros()) {
        origin.setCoordinate(this.nifti.dims[1] / 2.0, this.nifti.dims[2] / 2.0, this.nifti.dims[3] / 2.0);
    }

    return origin;
};


papaya.volume.nifti.HeaderNIFTI.prototype.qFormHasRotations = function () {
    return papaya.volume.Transform.hasRotations(this.getQformMatCopy());
};


papaya.volume.nifti.HeaderNIFTI.prototype.sFormHasRotations = function () {
    return papaya.volume.Transform.hasRotations(this.getSformMatCopy());
};


papaya.volume.nifti.HeaderNIFTI.prototype.getImageRange = function () {
    var ir = new papaya.volume.ImageRange(this.nifti.cal_min, this.nifti.cal_max),
        slope = this.nifti.scl_slope;

    if (slope === 0) {
        slope = 1;
    }

    ir.setGlobalDataScale(slope, this.nifti.scl_inter);
    return ir;
};



papaya.volume.nifti.HeaderNIFTI.prototype.hasError = function () {
    return this.nifti.hasError();
};



papaya.volume.nifti.HeaderNIFTI.prototype.getImageDescription = function () {
    return new papaya.volume.ImageDescription(this.nifti.description);
};



papaya.volume.nifti.HeaderNIFTI.prototype.getOrientationCertainty = function () {
    var certainty, origin;

    certainty = papaya.volume.Header.ORIENTATION_CERTAINTY_UNKNOWN;

    if ((this.nifti.qform_code > 0) || (this.nifti.sform_code > 0)) {
        certainty = papaya.volume.Header.ORIENTATION_CERTAINTY_LOW;

        origin = this.getOrigin();
        if ((origin !== null) && !origin.isAllZeros()) {
            certainty = papaya.volume.Header.ORIENTATION_CERTAINTY_HIGH;
        }
    }

    return certainty;
};



papaya.volume.nifti.HeaderNIFTI.prototype.getBestTransform = function () {
    if ((this.nifti.qform_code > 0) && (this.nifti.qform_code > this.nifti.sform_code) && this.qFormHasRotations()) {
        return this.getQformMatCopy();
    }

    if ((this.nifti.sform_code > 0) && (this.nifti.sform_code >= this.nifti.qform_code) && this.sFormHasRotations()) {
        return this.getSformMatCopy();
    }

    return null;
};



papaya.volume.nifti.HeaderNIFTI.prototype.getBestTransformOrigin = function () {
    if ((this.nifti.qform_code > 0) && (this.nifti.qform_code > this.nifti.sform_code) && this.qFormHasRotations()) {
        return this.getOrigin(true, false);
    }

    if ((this.nifti.sform_code > 0) && (this.nifti.sform_code >= this.nifti.qform_code) && this.sFormHasRotations()) {
        return this.getOrigin(false, true);
    }

    return null;
};
