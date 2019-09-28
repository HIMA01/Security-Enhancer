var storage = chrome.storage.local;
var alexa = null;
var salt = null;


//========================================
//Event Listeners
//========================================

//Preload Alexa Top 10K into local storage
chrome.runtime.onInstalled.addListener(function(details) {
	var fileAlexa = chrome.runtime.getURL("alexa top 10k.txt");
	fetch(fileAlexa)
		.then((response) => response.text())
		.then((data) => parseAlexaFile(data));
});

//Respond to messages sent by content scripts.	
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.type == "getSalt") {
		//If the salt hasn't been loaded from storage, attempt loading. If it doesn't exist, generate a new salt and store it.
		if (salt == null) {
			storage.get("salt", function(data) {
				var storedSalt;
				
				if (data.hasOwnProperty("salt"))
					storedSalt = data.salt;
				else {
					storedSalt = Math.floor(Math.random() * 90000) + 10000;
					storage.set({"salt": storedSalt}, function() {});
				}
				
				salt = storedSalt;
				sendResponse({saltedPassword: salt + request.password});
			});
		}
		else sendResponse({saltedPassword: salt + request.password});
	}
	else if (request.type == "passwordHashAdd") {
		//Add password info to user's data, creating a new list if it doesn't exist.
		storage.get("pwd", function(data) {
			var pwdList = [];
			
			if (data.hasOwnProperty("pwd"))
				pwdList = data.pwd;
			
			pwdList.push({hostname: request.hostname, hash: request.hash});
			
			storage.set({"pwd": pwdList}, function() {});
		});
	}
	else if (request.type == "passwordHashCheck") {
		//Get the user's stored password hash information, and iterate. If we encounter a record with the same hash but a 
		//different hostname, then the password is already in use. If we find a match, let the content script know so it doesn't duplicate data.
		storage.get("pwd", function(data) {
			var pwdList = [];
			
			if (data.hasOwnProperty("pwd"))
				pwdList = data.pwd;
			
			var credentialsFound = false;
			var matchFound = false;
			var pwdInUse = false;
			for (var i = 0; i < pwdList.length; i++) {
				if (pwdList[i].hash == request.hash) {
					if (pwdList[i].hostname == request.hostname) {
						matchFound = true;
					}
					else {
						pwdInUse = true;
					}
				}
				else if (pwdList[i].hostname == request.hostname)
					credentialsFound = true;
			}
			
			sendResponse({hostname: request.hostname, isSignup: request.isSignup, hash: request.hash, matchFound: matchFound, pwdInUse: pwdInUse, 
				credentialsFound: credentialsFound});
		});
	}
	else if (request.type == "whitelistAdd") {
		//Add domain to user's whitelist, creating a new list if it doesn't exist.
		storage.get("wl", function(data) {
			var whitelist;
			
			if (data.hasOwnProperty("wl"))
				whitelist = data.wl;
			else
				whitelist = [];
			
			whitelist.push(request.hostname);
			
			storage.set({"wl": whitelist }, function() {
				sendResponse({url: request.url});
			});
		});
	}
	else if (request.type == "whitelistCheck") {
		//To check whitelist, load alexa and user whitelists from storage, and check if hostname is present in either.
		storage.get("wl", function(data) {
			var whitelisted = false;
			var whitelist;
			
			if (data.hasOwnProperty("wl"))
				whitelist = data.wl;
			else
				whitelist = [];
			
			if (alexa == null)
				loadAlexa();
			
			if (matchDomain(whitelist, request.hostname) || matchDomain(alexa, request.hostname)) {
				whitelisted = true;
			}
			
			sendResponse({whitelisted: whitelisted, hostname: request.hostname, url: request.url});
		});
	}
	
	return true;
});


//========================================
//Helper Functions
//========================================

//Load Alexa data from storage
function loadAlexa() {
	alexa = JSON.parse(localStorage["alexa"]);
}

//Check if the domain whitelist contains a domain, potentially ignoring its subdomains
function matchDomain(domainList, domain) {
	for (var i = 0; i < domainList.length; i++) {
		if (domain.endsWith(domainList[i]))
			return true;
	}
	return false;
}

//Parses and stores text content of Alexa Top 10K file
function parseAlexaFile(data) {
	var domains = data.split("\r\n");
	localStorage["alexa"] = JSON.stringify(domains);
}