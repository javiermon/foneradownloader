/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 fonerastatus.js : Fonera Javascript helper
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

let EXPORTED_SYMBOLS = ["FoneraStatus"];

let Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);

Components.utils.import("resource://modules/fonera.js");
Components.utils.import("resource://modules/format.js");

// STATUSBAR
let FoneraStatus = {

    printErrors : function() {
        let stringsBundle = document.getElementById("string-bundle");
        let errors = Application.storage.get(Fonera.LASTERROR, null);
        let panel = document.getElementById('foneraDownloader-sbpanel-errors');

        if (errors != null) {
            panel.src = "chrome://global/skin/icons/warning-16.png";
            panel.tooltipText = errors + " : "  + stringsBundle.getString('downloadFailed');
        } else {
            panel.src = "";
            panel.tooltipText = "";
        }
    },

    clearErrors : function() {
        Application.storage.set(Fonera.LASTERROR, null);
        let panel = document.getElementById('foneraDownloader-sbpanel-errors');
        panel.src = "";
        panel.tooltipText = "";
    },

    drawTooltip : function() {
        Application.console.log("Checking downloads list\n");
        let stringsBundle = document.getElementById("string-bundle");
        let authToken = Application.storage.get(Fonera.AUTHTOKEN, null);
        let panel = document.getElementById('foneraDownloader-sbpanel');
        if (authToken == Fonera.authFailed) {
            Application.console.log("Authentication failed!\n");
            // TODO: style="color: red;""
            panel.tooltipText = stringsBundle.getString('authFailString');
            panel.src = "chrome://global/skin/icons/warning-16.png";
            return;
        } else if (authToken == Fonera.authError) {
            panel.tooltipText = stringsBundle.getString('authErrorString');
            panel.src = "chrome://global/skin/icons/error-16.png";
            return;
        } else if (authToken == null) {
            Application.console.log("Waiting for authentication!\n");
            return;
        }

        // check disks:
        let disksToken = Application.storage.get(Fonera.DISKS, Fonera.noDisk);
        if (disksToken == Fonera.noDisk) {
            panel.tooltipText = stringsBundle.getString('noDiskErrorString');
            panel.src = "chrome://global/skin/icons/warning-16.png";
            return;
        }

        panel.src = "chrome://global/skin/icons/information-16.png";
        let foneraStatus = document.getElementById("foneraDownloader-sbpanel");

        let foneradownloads = Application.storage.get(Fonera.FONERADOWNLOADS, []);
        let totaldownloads = foneradownloads.length;
        if (totaldownloads == 0)
            foneraStatus.tooltipText = stringsBundle.getString('noFilesFound');
        else
            foneraStatus.tooltipText = totaldownloads + " " + stringsBundle.getString('totaldownloads');
    }

};

