/* jshint node: true */

'use strict';

var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var async = require('async');
var assert = require('assert');
var PNG = require('pngjs').PNG;
var Protobuf = require('pbf');

var pattern = /(?:-(\d+|sdf))?(?:@(\d+(?:\.\d+)?)x?)?$/;

function collectImages(paths, p) {
    var stat = fs.statSync(p);
    if (stat.isDirectory()) {
        var dir = fs.readdirSync(p);
        for (var i = 0; i < dir.length; i++) {
            collectImages(paths, path.join(p, dir[i]));
        }
    } else {
        var ext = path.extname(p);
        if (ext === '.png' && paths.indexOf(p) < 0) {
            paths.push(p);
        }
    }
}

exports.findImages = findImages;
function findImages(roots, callback) {
    var paths = [];
    for (var i = 0; i < roots.length; i++) {
        collectImages(paths, roots[i]);
    }

    callback(null, paths);
}

function loadImage(p, callback) {
    var base = path.basename(p, path.extname(p));
    var match = base.match(pattern);
    var name = base.substring(0, match.index);


    var image = {};
    if (match[1] === 'sdf') {
        image.sdf = true;
    } else if (typeof match[1] !== 'undefined') {
        image.width = image.height = Number(match[1]);
        assert.ok(!isNaN(image.width));
        assert.ok(!isNaN(image.height));
    }

    if (typeof match[2] !== 'undefined') {
        image.ratio = Number(match[2]);
        assert.ok(!isNaN(image.ratio));
    } else {
        image.ratio = 1;
    }

    var png = new PNG();
    png.parse(fs.readFileSync(p), function(err) {
        if (err) return callback(err);

        // Verify image dimensions match file size
        var width, height;
        if (typeof image.width !== 'undefined') {
            width = image.width * image.ratio;
            assert.equal(png.width, width, p + ' is ' + png.width + ' pixels wide, but expected ' + width);
        } else {
            width = png.width;
            image.width = width / image.ratio;
        }

        if (typeof image.height !== 'undefined') {
            height = image.height * image.ratio;
            assert.equal(png.height, height, p + ' is ' + png.height + ' pixels high, but expected ' + height);
        } else {
            height = png.height;
            image.height = height / image.ratio;
        }

        if (image.sdf) {
            // Remove color channel for SDF images
            var bitmap = new Buffer(png.data.length / 4);
            assert.equal(bitmap.length, width * height);
            for (var i = 3, j = 0; i < png.data.length; (i += 4), j++) {
                bitmap[j] = png.data[i];
            }
            image.bitmap = bitmap;
        } else {
            assert.equal(png.data.length, width * height * 4);
            image.bitmap = png.data;
        }

        // bytes += image.bitmap.length + 32;

        callback(null, name, image);
    });
}

exports.loadImages = loadImages;
function loadImages(paths, callback) {
    var images = {};
    async.each(paths, function(path, callback) {
        loadImage(path, function(err, name, image) {
            if (err) return callback(err);
            if (!(name in images)) images[name] = [];
            images[name].push(image);
            callback(err);
        });
    }, function(err) {
        if (err) callback(err);
        else callback(err, images);
    });
}

exports.encodeSprite = encodeSprite;
function encodeSprite(images, callback) {
    // Encode as PBF
    var pbf = new Protobuf(new Buffer(1024));
    for (var name in images) {
        var icon = images[name];
        var icon_pbf = new Protobuf(new Buffer(512 * icon.length));
        icon_pbf.writeTaggedString(1 /* name */, name);

        for (var i = 0; i < icon.length; i++) {
            var image = icon[i];
            var image_pbf = new Protobuf(new Buffer(image.bitmap.length + 32));
            image_pbf.writeTaggedVarint(1 /* width */, image.width);
            image_pbf.writeTaggedVarint(2 /* height */, image.height);
            if (image.ratio !== 1) image_pbf.writeTaggedFloat(3 /* ratio */, image.ratio);
            if (image.sdf) image_pbf.writeTaggedBoolean(4 /* sdf */, image.sdf);
            image_pbf.writeTaggedBuffer(5 /* bitmap */, image.bitmap);

            icon_pbf.writeMessage(2 /* images */, image_pbf);
        }

        pbf.writeMessage(1 /* icons */, icon_pbf);
    }

    callback(null, pbf.finish());
}
