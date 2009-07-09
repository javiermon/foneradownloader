/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 format.js : Fonera Javascript helper
 (C) Fon
 Author: Javier Monteagudo (Javier.monteagudo@fon.com)

 This program is free software: you can redistribute it and/or modify it
 under the terms of the GNU General Public License as published by the
 Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful, but
 WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along
 with this program.  If not, see <http://www.gnu.org/licenses/>.

*/

let EXPORTED_SYMBOLS = ["FoneraFormat"];

let strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].
    getService(Components.interfaces.nsIStringBundleService);

// STATUSBAR
let FoneraFormat = {

    /**
     *   Convert number of bytes into human readable format
     *   @param integer bytes     Number of bytes to convert
     *   @param integer precision Number of digits after the decimal separator
     *   @return string
     *
     * */
    bytesToSize : function(bytes, precision) {
        let kilobyte = 1024;
	let megabyte = kilobyte * 1024;
	let gigabyte = megabyte * 1024;
	let terabyte = gigabyte * 1024;
	if ((bytes >= 0) && (bytes < kilobyte)) {
	  return bytes + ' B';
	} else if ((bytes >= kilobyte) && (bytes < megabyte)) {
	  return (bytes / kilobyte).toFixed(precision) + ' KB';
	} else if ((bytes >= megabyte) && (bytes < gigabyte)) {
	  return (bytes / megabyte).toFixed(precision) + ' MB';
	} else if ((bytes >= gigabyte) && (bytes < terabyte)) {
	  return (bytes / gigabyte).toFixed(precision) + ' GB';
	} else if (bytes >= terabyte) {
	  return (bytes / terabyte).toFixed(precision) + ' TB';
	} else {
	  return bytes + ' B';
	}
    },

    stateName : function(elmt) {
        // translate state to human
        // http://www.oreillynet.com/pub/a/mozilla/2000/11/10/localizing.html?page=2
        let stringsBundle = strBundleService.
            createBundle("chrome://foneradownloader/locale/foneradownloader.properties");
        try {
            return stringsBundle.GetStringFromName(elmt);
        } catch (e) {
            return stringsBundle.GetStringFromName('waiting');
        }
    },

    transmissionStateName : function(elmt) {
        // translate state to internal string, similar to how the fonera shows downloads
        // TODO: there are more states, find them
        if (elmt == 8)
            return 'done';
        else if (elmt == 4)
            return 'load';
        else if (elmt == 16)
            return 'paused';
        return 'waiting';
    },

    colorPicker : function(item) {
        switch(item) {
        case "suspended":
        case "pending":
        case "paused":
        case "waiting":
            return "GoldenRod";
        case "loading":
        case "load":
        case "active":
            return "green";
        case "done":
            return "green";
        case "hashing":
            return "blue";
        case "error":
            return "red";
        default:
            return "";
        }
    }
};