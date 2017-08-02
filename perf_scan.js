/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

// Register resource://app/ URI
let ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
let resHandler = ios.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
let mozDir = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties).get("CurProcD", Ci.nsILocalFile);
let mozDirURI = ios.newFileURI(mozDir);
resHandler.setSubstitution("app", mozDirURI);


Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
XPCOMUtils.defineLazyGetter(this, "Timer", function() {
  let timer = {};
  Cu.import("resource://gre/modules/Timer.jsm", timer);
  return timer;
});


if (!arguments || arguments.length < 1) {

  throw "Usage: xpcshell sslScan.js <-u=uri>\n";
}

/*

-u :  URI to scan (without scheme)

-p :  preferences to apply (multiple flags supported)
      NOTE: Boolean pref values must be passed in as false/true and not 0/1

-s : number of times to scan URI

*/
  
var completed = false;
var debug = false; 
var host;
var host_array = [];
var scans = 1; // default
var prefs = [];
var start_time;
var response_speeds = [];
var counter = 0;

for (var i=0;i<arguments.length;i++)
{
  if (arguments[i].indexOf("-u=") != -1)
  {
    host = arguments[i].split("-u=")[1].toLowerCase();
  }
  if (arguments[i].indexOf("-s=") != -1)
  {
    scans = Number (arguments[i].split("-s=")[1].toLowerCase());
  }

  if (arguments[i].indexOf("-p=") != -1)
  {
    var temp1 = arguments[i].split("-p=")[1];
    var temp2 = temp1.split("=");
    var o = {};
    o.name = temp2[0];
    o.value = temp2[1];
    prefs.push (o);
  }
}



try
{
  for (var i=0;i<prefs.length;i++)
  {
    var value = prefs[i].value;
    if ( value == "true" || value == "false" )
    {
      var n = (value == "false" ? 0 : 1);
      Services.prefs.setBoolPref(prefs[i].name, n);
    } else if (!isNaN(value))
    {
      Services.prefs.setIntPref(prefs[i].name,value);
    } else {
      Services.prefs.setPref(prefs[i].name,value);
    }
  }
} catch (e)
{
  infoMessage (e.message + "\n\n")
}

// custom prefs can go here
// Services.prefs.setIntPref("security.pki.netscape_step_up_policy", 3)




function RedirectStopper() {}
RedirectStopper.prototype = {
  // nsIChannelEventSink
  asyncOnChannelRedirect: function(oldChannel, newChannel, flags, callback) {
    throw Cr.NS_ERROR_ENTITY_CHANGED;
  },
  getInterface: function(iid) {
    return this.QueryInterface(iid);
  },
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIChannelEventSink])
};


function queryURI(uri) {
  try {
    start_time = new Date();

    let req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);

    req.open("HEAD", uri, true);
    //req.channel.notificationCallbacks = new RedirectStopper();
    req.addEventListener("error", recordResult, false);
    req.addEventListener("load", recordResult, false);
    req.send();

  } catch (e) {
    infoMessage("Runtime error for XHR: " + e.message)
  }
}

function recordResult(e) {
  response_speeds.push (new Date().getTime() - start_time);
  counter++;
  if ( counter < scans)
  {
    loadURI(host_array[counter]);
  } else {
    completed = true;
    //print_test_results();
    print_connection_speed();
  }
}

function loadURI(uri) {
  queryURI(uri);
  waitForAResponse(() => completed != true);
}

function waitForAResponse(condition) {
  try {
    let threadManager = Cc["@mozilla.org/thread-manager;1"].getService(Ci.nsIThreadManager);
    let mainThread = threadManager.currentThread;
    while (condition()) {
      mainThread.processNextEvent(true);
    }
  } catch(e) {
    failRun(e.message); 
  }
}

function infoMessage(arg)
{
  if (debug)
  {
    dump ("ERROR: " + arg + "\n");
  }
}
function failRun(arg)
{
  dump ("FAIL: fatal error: " + arg + "\n")
  completed = true;
}

function build_host_list()
{
  for (var i=0;i<scans;i++)
  {
    host_array.push(host);
  }
}

function calculate_average_speed(sample_list)
{
    var num_samples = sample_list.length;
    var running_total = 0
    for (var i=0;i<num_samples;i++)
    {
        running_total += sample_list[i]
    }
    return running_total / num_samples;     
}


function calculate_median_speed(sample_list)
{
    var median;
    sample_list.sort()
    var num_samples = sample_list.length;
    var middle = Math.floor(num_samples/2)
    if (num_samples % 2 == 1)
    {
        median = sample_list[middle]
    }
    else {
        median = (sample_list[middle] + sample_list[middle-1]) / 2
    }
    return median;
}


function print_test_results()
{
  dump ("Scan results for " + host + "\n")
  dump ("\n");
  dump ("Samples: " + response_speeds.toString() + "\n");
  dump ("Average speed: " + calculate_average_speed(response_speeds) + "\n");
  dump ("Median speed: " + calculate_median_speed(response_speeds) + "\n");
}

function print_connection_speed()
{
  dump (response_speeds[0]);
}

try {
  build_host_list();
  //dump ("Scanning host: " + host + "\n");
  loadURI(host_array[0])
} catch (e) {
  failRun(e.message);
}
