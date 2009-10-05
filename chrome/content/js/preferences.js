/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

/*

 preferences.js : Fonera Javascript helper
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

let EXPORTED_SYMBOLS = ["FoneraPrefs"];

let Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);

let PreferencesBranch = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService).getBranch("extensions.foneradownloader.");

Components.utils.import("resource://modules/fonera.js");

let FoneraPrefs = {

    applyAction : function () {
        try {

            let password = document.getElementById("password");
            let passwordPref = "password";

            PreferencesBranch.setCharPref(passwordPref, password.value);

            let foneraip = document.getElementById("foneraip");
            let foneraipPref = "foneraip";

            PreferencesBranch.setCharPref(foneraipPref, foneraip.value);

            let onwan = document.getElementById("onwan");
            let onwanPref = "onwan";

            PreferencesBranch.setBoolPref(onwanPref, onwan.checked);

            let enabled = document.getElementById("enabled");
            let enabledPref = "enabled";

            PreferencesBranch.setBoolPref(enabledPref, enabled.checked);

            Fonera.checkFoneraAvailable(true);

        } catch(e) {
            Application.console.log(e);
        }

    },

    loadValues : function () {
        try {

            let password = document.getElementById("password");
            let passwordPref = "password";

            password.value = PreferencesBranch.getCharPref(passwordPref);

            let foneraip = document.getElementById("foneraip");
            let foneraipPref = "foneraip";

            foneraip.value = PreferencesBranch.getCharPref(foneraipPref);

            let onwan = document.getElementById("onwan");
            let onwanPref = "onwan";

            onwan.checked = PreferencesBranch.getBoolPref(onwanPref);

            let enabled = document.getElementById("enabled");
            let enabledPref = "enabled";

            enabled.checked = PreferencesBranch.getBoolPref(enabledPref);

        } catch(e) {
            Application.console.log(e);
        }

    },

    loadEvents : function() {

    },

    unloadEvents : function() {

    }

};

