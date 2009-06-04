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

// https://developer.mozilla.org/en/Code_snippets/Preferences

let Application = Components.classes["@mozilla.org/fuel/application;1"]
    .getService(Components.interfaces.fuelIApplication);

Components.utils.import("resource://modules/fonera.js");

function PrefListener(branchName, func) {

  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService);
  var branch = prefService.getBranch(branchName);
  branch.QueryInterface(Components.interfaces.nsIPrefBranch2);

  this.register = function()  {
      branch.addObserver("", this, false);
      //branch.getChildList("", { })
      //    .forEach(function (name) {
      //    func(branch, name); });
  };

  this.unregister = function unregister()  {
      if (branch)
          branch.removeObserver("", this);
  };

  this.observe = function(subject, topic, data)  {
      if (topic == "nsPref:changed")
          func(branch, data);
  };
}

var myListener = new PrefListener("extensions.foneradownloader.",
		   function(branch, name) {
		     switch (name) {
                         case "username":
                         case "password":
                         case "foneraip":
		             Fonera.checkFoneraAvailable(true);
                             break;
                         default:
                             break;
		     }
		   });

myListener.register();
